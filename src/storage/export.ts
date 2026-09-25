import { z } from "zod";

import type { Card } from "ts-fsrs";
import type {
  AppSettings,
  DiagnosticState,
  ReviewAttempt,
  SkillState
} from "@/types/learning";

import {
  defaultAppSettings,
  SINGLETON_KEY,
  type BrunankiDatabase
} from "./database";

export const EXPORT_FORMAT = "brunanki-export" as const;
export const EXPORT_SCHEMA_VERSION = 2 as const;

const isoDateTimeSchema = z.string().datetime({ offset: true });

/**
 * A versão do catálogo é uma data em AAAA.MM.DD — o formato que
 * `scripts/refresh-catalog.ts` grava. Validar aqui impede que um backup com
 * outro formato seja aceito e depois comparado como string opaca.
 */
const catalogVersionSchema = z
  .string()
  .regex(
    /^\d{4}\.\d{2}\.\d{2}$/,
    "A versão de catálogo deve ter o formato AAAA.MM.DD"
  );
const skillSchema = z.enum(["flagToNameRecall", "nameToFlagRecognition"]);
const outcomeSchema = z.enum(["correct", "partial", "incorrect", "skipped"]);
const exerciseSchema = z.enum([
  "diagnostic",
  "flagToNameChoice",
  "nameToFlagChoice",
  "flagToNameInput"
]);

const serializedCardSchema = z.object({
  due: isoDateTimeSchema,
  stability: z.number().nonnegative(),
  difficulty: z.number().nonnegative(),
  elapsed_days: z.number().nonnegative(),
  scheduled_days: z.number().nonnegative(),
  learning_steps: z.number().int().nonnegative(),
  reps: z.number().int().nonnegative(),
  lapses: z.number().int().nonnegative(),
  state: z.number().int().min(0).max(3),
  last_review: isoDateTimeSchema.optional()
});

const serializedSkillStateSchema = z
  .object({
    id: z.string().min(1),
    entityId: z.string().min(1),
    skill: skillSchema,
    phase: z.enum(["unseen", "acquiring", "scheduled"]),
    card: serializedCardSchema.optional(),
    distinctSuccessDays: z.array(z.string().date()),
    lastOutcome: outcomeSchema.optional(),
    updatedAt: isoDateTimeSchema
  })
  .superRefine((state, context) => {
    if (state.id !== `${state.entityId}::${state.skill}`) {
      context.addIssue({
        code: "custom",
        path: ["id"],
        message: "ID do estado não corresponde à entidade e habilidade"
      });
    }
    if (
      new Set(state.distinctSuccessDays).size !==
      state.distinctSuccessDays.length
    ) {
      context.addIssue({
        code: "custom",
        path: ["distinctSuccessDays"],
        message: "Dias de sucesso duplicados"
      });
    }
    if (state.phase === "unseen" && state.card !== undefined) {
      context.addIssue({
        code: "custom",
        path: ["card"],
        message: "Uma habilidade não vista não pode possuir cartão FSRS"
      });
    }
  });

const reviewAttemptSchema = z.object({
  id: z.string().min(1),
  entityId: z.string().min(1),
  skill: skillSchema,
  exercise: exerciseSchema,
  outcome: outcomeSchema,
  isImmediateCorrection: z.boolean(),
  responseMs: z.number().int().nonnegative(),
  answer: z.string().optional(),
  createdAt: isoDateTimeSchema
});

const diagnosticStateSchema = z
  .object({
    entityOrder: z.array(z.string().min(1)).min(1),
    currentIndex: z.number().int().nonnegative(),
    startedAt: isoDateTimeSchema,
    completedAt: isoDateTimeSchema.optional()
  })
  .superRefine((state, context) => {
    if (new Set(state.entityOrder).size !== state.entityOrder.length) {
      context.addIssue({
        code: "custom",
        path: ["entityOrder"],
        message: "O diagnóstico contém entidades duplicadas"
      });
    }
    if (state.currentIndex > state.entityOrder.length) {
      context.addIssue({
        code: "custom",
        path: ["currentIndex"],
        message: "O índice do diagnóstico excede o total de entidades"
      });
    }
    if (
      state.completedAt !== undefined &&
      state.currentIndex !== state.entityOrder.length
    ) {
      context.addIssue({
        code: "custom",
        path: ["completedAt"],
        message: "Um diagnóstico incompleto não pode ter data de conclusão"
      });
    }
  });

const settingsSchema = z.object({
  desiredRetention: z.number().positive().max(1),
  timeZone: z.string().min(1)
});

function uniqueIds<T extends { id: string }>(
  values: readonly T[],
  path: string,
  context: z.RefinementCtx
): void {
  if (new Set(values.map(({ id }) => id)).size !== values.length) {
    context.addIssue({
      code: "custom",
      path: [path],
      message: "Há IDs duplicados"
    });
  }
}

const exportV2Schema = z.object({
  format: z.literal(EXPORT_FORMAT),
  schemaVersion: z.literal(2),
  catalogVersion: catalogVersionSchema,
  exportedAt: isoDateTimeSchema,
  settings: settingsSchema,
  skillStates: z.array(serializedSkillStateSchema),
  attempts: z.array(reviewAttemptSchema),
  diagnosticState: diagnosticStateSchema.optional()
});

type ExportV2 = z.infer<typeof exportV2Schema>;

/**
 * Há uma única forma legível, e nenhum caminho de migração.
 *
 * O formato foi renomeado junto com o produto (ADR-0001), e o rename é
 * deliberadamente incompatível: todo backup emitido antes traz
 * `format: "ptanki-export"` e é recusado já no primeiro campo.
 * Manter o esquema anterior aqui só descreveria um arquivo que nunca existiu —
 * `format` atual combinado com `schemaVersion` antigo.
 *
 * `schemaVersion` continua sendo um literal, e não um número qualquer, para
 * que um backup de versão futura falhe de forma explícita em vez de ser
 * aceito como atual e perder campos em silêncio.
 */
export const brunankiExportSchema = exportV2Schema.superRefine(
  (data, context) => {
    uniqueIds(data.skillStates, "skillStates", context);
    uniqueIds(data.attempts, "attempts", context);
  }
);

export type SerializedCard = z.infer<typeof serializedCardSchema>;
export type BrunankiExport = ExportV2;

export interface PreparedImport {
  data: BrunankiExport;
  backupJson: string;
}

/**
 * O catálogo contra o qual um backup será importado.
 *
 * O que de fato protege os dados na importação não é a igualdade entre as
 * strings de versão, e sim o backup só referenciar entidades que o catálogo
 * atual conhece: `pnpm data:refresh` muda a versão sempre que reconfere as
 * fontes, mesmo quando nenhum ID muda. Guardar a versão como gate rejeitava
 * todos os backups a cada refresh, sem ganho de segurança.
 */
export interface ImportTarget {
  readonly catalogVersion: string;
  readonly knownEntityIds: ReadonlySet<string>;
}

/** Backup que referencia entidades ausentes do catálogo atual. */
export class UnknownEntitiesError extends Error {
  constructor(readonly unknownEntityIds: readonly string[]) {
    const shown = unknownEntityIds.slice(0, 5).join(", ");
    const rest = unknownEntityIds.length - 5;
    super(
      `O backup referencia entidades que não existem no catálogo atual: ${shown}${
        rest > 0 ? ` e mais ${rest}` : ""
      }`
    );
    this.name = "UnknownEntitiesError";
  }
}

function serializeCard(card: Card): SerializedCard {
  return {
    due: new Date(card.due).toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    learning_steps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    ...(card.last_review
      ? { last_review: new Date(card.last_review).toISOString() }
      : {})
  };
}

function serializeSkillState(
  state: SkillState
): BrunankiExport["skillStates"][number] {
  return {
    id: state.id,
    entityId: state.entityId,
    skill: state.skill,
    phase: state.phase,
    distinctSuccessDays: state.distinctSuccessDays,
    updatedAt: state.updatedAt,
    ...(state.lastOutcome ? { lastOutcome: state.lastOutcome } : {}),
    ...(state.card ? { card: serializeCard(state.card) } : {})
  };
}

function deserializeSkillState(
  state: BrunankiExport["skillStates"][number]
): SkillState {
  const card: Card | undefined = state.card
    ? ({
        ...state.card,
        due: new Date(state.card.due),
        ...(state.card.last_review
          ? { last_review: new Date(state.card.last_review) }
          : {})
      } as Card)
    : undefined;
  return {
    id: state.id,
    entityId: state.entityId,
    skill: state.skill,
    phase: state.phase,
    distinctSuccessDays: state.distinctSuccessDays,
    updatedAt: state.updatedAt,
    ...(state.lastOutcome ? { lastOutcome: state.lastOutcome } : {}),
    ...(card ? { card } : {})
  };
}

export async function createExport(
  db: BrunankiDatabase,
  catalogVersion: string,
  now: Date = new Date()
): Promise<BrunankiExport> {
  const [skillStates, attempts, diagnosticRecord, settingsRecord] =
    await Promise.all([
      db.skillStates.toArray(),
      db.attempts.toArray(),
      db.diagnostics.get(SINGLETON_KEY),
      db.appSettings.get(SINGLETON_KEY)
    ]);
  const settings: AppSettings =
    settingsRecord?.settings ?? defaultAppSettings();

  return brunankiExportSchema.parse({
    format: EXPORT_FORMAT,
    schemaVersion: EXPORT_SCHEMA_VERSION,
    catalogVersion,
    exportedAt: now.toISOString(),
    settings,
    skillStates: skillStates.map(serializeSkillState),
    attempts,
    diagnosticState: diagnosticRecord?.state
  });
}

export async function serializeDatabaseExport(
  db: BrunankiDatabase,
  catalogVersion: string,
  now: Date = new Date()
): Promise<string> {
  return JSON.stringify(await createExport(db, catalogVersion, now), null, 2);
}

export function parseExportJson(json: string): BrunankiExport {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new Error("O arquivo não contém JSON válido");
  }
  return brunankiExportSchema.parse(raw);
}

export async function prepareImport(
  db: BrunankiDatabase,
  json: string,
  target: ImportTarget,
  now: Date = new Date()
): Promise<PreparedImport> {
  const data = parseExportJson(json);

  const referenced = new Set<string>();
  for (const state of data.skillStates) referenced.add(state.entityId);
  for (const attempt of data.attempts) referenced.add(attempt.entityId);
  for (const id of data.diagnosticState?.entityOrder ?? []) referenced.add(id);

  const unknown = [...referenced]
    .filter((id) => !target.knownEntityIds.has(id))
    .sort();
  if (unknown.length > 0) {
    throw new UnknownEntitiesError(unknown);
  }

  return {
    data,
    backupJson: await serializeDatabaseExport(db, target.catalogVersion, now)
  };
}

export async function applyPreparedImport(
  db: BrunankiDatabase,
  prepared: PreparedImport
): Promise<void> {
  const data = brunankiExportSchema.parse(prepared.data);
  const states = data.skillStates.map(deserializeSkillState);

  await db.transaction(
    "rw",
    db.skillStates,
    db.attempts,
    db.diagnostics,
    db.appSettings,
    async () => {
      await Promise.all([
        db.skillStates.clear(),
        db.attempts.clear(),
        db.diagnostics.clear(),
        db.appSettings.clear()
      ]);
      await db.skillStates.bulkAdd(states);
      await db.attempts.bulkAdd(data.attempts as ReviewAttempt[]);
      if (data.diagnosticState) {
        await db.diagnostics.add({
          id: SINGLETON_KEY,
          state: data.diagnosticState as DiagnosticState
        });
      }
      await db.appSettings.add({
        id: SINGLETON_KEY,
        settings: data.settings
      });
    }
  );
}
