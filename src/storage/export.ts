import { z } from "zod";

import type { Card } from "ts-fsrs";
import type {
  AppSettings,
  DiagnosticState,
  ReviewAttempt,
  SkillState
} from "@/types/learning";

import {
  DEFAULT_APP_SETTINGS,
  SINGLETON_KEY,
  type PtankiDatabase
} from "./database";

export const EXPORT_FORMAT = "ptanki-export" as const;
export const EXPORT_SCHEMA_VERSION = 1 as const;

const isoDateTimeSchema = z.string().datetime({ offset: true });
const skillSchema = z.enum(["flagToNameRecall", "nameToFlagRecognition"]);
const outcomeSchema = z.enum(["correct", "partial", "incorrect", "skipped"]);
const exerciseSchema = z.enum([
  "diagnostic",
  "flagToNameChoice",
  "nameToFlagChoice",
  "flagToNameInput",
  "confusablePair",
  "fluency"
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
  reduceMotion: z.boolean()
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

export const ptankiExportSchema = z
  .object({
    format: z.literal(EXPORT_FORMAT),
    schemaVersion: z.literal(EXPORT_SCHEMA_VERSION),
    catalogVersion: z.string().min(1),
    exportedAt: isoDateTimeSchema,
    settings: settingsSchema,
    skillStates: z.array(serializedSkillStateSchema),
    attempts: z.array(reviewAttemptSchema),
    diagnosticState: diagnosticStateSchema.optional()
  })
  .superRefine((data, context) => {
    uniqueIds(data.skillStates, "skillStates", context);
    uniqueIds(data.attempts, "attempts", context);
  });

export type SerializedCard = z.infer<typeof serializedCardSchema>;
export type PtankiExport = z.infer<typeof ptankiExportSchema>;

export interface PreparedImport {
  data: PtankiExport;
  backupJson: string;
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
): PtankiExport["skillStates"][number] {
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
  state: PtankiExport["skillStates"][number]
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
  db: PtankiDatabase,
  catalogVersion: string,
  now: Date = new Date()
): Promise<PtankiExport> {
  const [skillStates, attempts, diagnosticRecord, settingsRecord] =
    await Promise.all([
      db.skillStates.toArray(),
      db.attempts.toArray(),
      db.diagnostics.get(SINGLETON_KEY),
      db.appSettings.get(SINGLETON_KEY)
    ]);
  const settings: AppSettings =
    settingsRecord?.settings ?? DEFAULT_APP_SETTINGS;

  return ptankiExportSchema.parse({
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
  db: PtankiDatabase,
  catalogVersion: string,
  now: Date = new Date()
): Promise<string> {
  return JSON.stringify(await createExport(db, catalogVersion, now), null, 2);
}

export function parseExportJson(json: string): PtankiExport {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new Error("O arquivo não contém JSON válido");
  }
  return ptankiExportSchema.parse(raw);
}

export async function prepareImport(
  db: PtankiDatabase,
  json: string,
  currentCatalogVersion: string,
  now: Date = new Date()
): Promise<PreparedImport> {
  const data = parseExportJson(json);
  if (data.catalogVersion !== currentCatalogVersion) {
    throw new Error(
      `Versão de catálogo incompatível: arquivo ${data.catalogVersion}, aplicativo ${currentCatalogVersion}`
    );
  }
  return {
    data,
    backupJson: await serializeDatabaseExport(db, currentCatalogVersion, now)
  };
}

export async function applyPreparedImport(
  db: PtankiDatabase,
  prepared: PreparedImport
): Promise<void> {
  const data = ptankiExportSchema.parse(prepared.data);
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
