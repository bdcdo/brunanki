import { z } from "zod";

import type { Card } from "ts-fsrs";
import type {
  AppSettings,
  PairState,
  ReviewAttempt,
  SkillState
} from "@/types/learning";
import { CONTINENT_IDS } from "@/types/geography";
import { pairStateId } from "@/domain/pairs";

import {
  completeAppSettings,
  SINGLETON_KEY,
  type BrunankiDatabase
} from "./database";

export const EXPORT_FORMAT = "brunanki-export" as const;
export const EXPORT_SCHEMA_VERSION = 3 as const;

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
    // Sem cartão, uma habilidade já vista nunca vence e, por não estar mais
    // "unseen", também não volta como novidade: a bandeira ficaria presa
    // fora da fila para sempre.
    if (state.phase !== "unseen" && state.card === undefined) {
      context.addIssue({
        code: "custom",
        path: ["card"],
        message: "Uma habilidade já vista precisa de cartão FSRS"
      });
    }
  });

const reviewAttemptSchema = z
  .object({
    id: z.string().min(1),
    entityId: z.string().min(1),
    skill: skillSchema,
    exercise: exerciseSchema,
    outcome: outcomeSchema,
    isImmediateCorrection: z.boolean(),
    mode: z.enum(["scheduled", "free"]),
    responseMs: z.number().int().nonnegative(),
    firstInputMs: z.number().int().nonnegative().optional(),
    guessed: z.boolean().optional(),
    awardedXp: z.union([z.literal(0), z.literal(1)]),
    answer: z.string().optional(),
    createdAt: isoDateTimeSchema
  })
  .superRefine((attempt, context) => {
    // O XP não é recalculado na importação, mas um ponto que a regra nunca
    // daria é backup adulterado ou corrompido, e inflaria o total. O inverso,
    // acerto com zero, é legítimo: a escolha logo depois da apresentação não
    // pontua, e isso não fica gravado noutro campo.
    if (
      attempt.awardedXp === 1 &&
      (attempt.outcome !== "correct" ||
        attempt.isImmediateCorrection ||
        attempt.guessed === true)
    ) {
      context.addIssue({
        code: "custom",
        path: ["awardedXp"],
        message: "XP concedido a uma tentativa que a regra não pontua"
      });
    }
  });

const serializedPairStateSchema = z
  .object({
    id: z.string().min(1),
    entityIds: z.tuple([z.string().min(1), z.string().min(1)]),
    card: serializedCardSchema.optional(),
    distinctSuccessDays: z.array(z.string().date()),
    lastOutcome: outcomeSchema.optional(),
    updatedAt: isoDateTimeSchema
  })
  .superRefine((pair, context) => {
    // Chave fora da forma canônica gravaria o mesmo par em dois cartões,
    // e a discriminação treinada numa ordem não contaria na outra.
    const [first, second] = pair.entityIds;
    if (
      first === second ||
      pair.id !== pairStateId(first, second) ||
      first > second
    ) {
      context.addIssue({
        code: "custom",
        path: ["id"],
        message: "O par não está na forma canônica"
      });
    }
  });

/**
 * O fuso tem de ser um que este navegador conhece. Um backup editado à mão, ou
 * vindo de um navegador com base de fusos mais nova, traria um nome que
 * `Intl` recusa, e a Hoje e a sessão, que contam o dia nesse fuso, cairiam
 * já ao abrir.
 */
function isKnownTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone });
    return true;
  } catch {
    return false;
  }
}

const settingsSchema = z.object({
  desiredRetention: z.number().positive().max(1),
  timeZone: z
    .string()
    .min(1)
    .refine(isKnownTimeZone, "Fuso horário desconhecido neste navegador"),
  activeContinent: z.enum(CONTINENT_IDS)
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

const exportV3Schema = z.object({
  format: z.literal(EXPORT_FORMAT),
  schemaVersion: z.literal(EXPORT_SCHEMA_VERSION),
  catalogVersion: catalogVersionSchema,
  exportedAt: isoDateTimeSchema,
  settings: settingsSchema,
  skillStates: z.array(serializedSkillStateSchema),
  attempts: z.array(reviewAttemptSchema),
  pairStates: z.array(serializedPairStateSchema)
});

type ExportV3 = z.infer<typeof exportV3Schema>;

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
export const brunankiExportSchema = exportV3Schema.superRefine(
  (data, context) => {
    uniqueIds(data.skillStates, "skillStates", context);
    uniqueIds(data.attempts, "attempts", context);
    uniqueIds(data.pairStates, "pairStates", context);
  }
);

export type SerializedCard = z.infer<typeof serializedCardSchema>;
export type BrunankiExport = ExportV3;

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

/**
 * Backup do próprio Brunanki, mas de antes do piloto.
 *
 * Existe para que a recusa diga o motivo. O esquema literal já recusaria o
 * arquivo, mas com um erro de validação que fala de `schemaVersion` e não diz
 * a quem restaura que o progresso antigo não volta, nem por quê.
 */
export class IncompatibleBackupError extends Error {
  constructor(readonly schemaVersion: number) {
    super(
      `Este backup é de uma versão anterior do Brunanki (formato ${schemaVersion}) e não pode ser restaurado. A versão atual recomeçou o progresso do zero, porque as tentativas antigas não registravam o que ela precisa medir.`
    );
    this.name = "IncompatibleBackupError";
  }
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

function deserializeCard(card: SerializedCard | undefined): Card | undefined {
  return card
    ? ({
        ...card,
        due: new Date(card.due),
        ...(card.last_review ? { last_review: new Date(card.last_review) } : {})
      } as Card)
    : undefined;
}

function serializePairState(
  pair: PairState
): BrunankiExport["pairStates"][number] {
  return {
    id: pair.id,
    entityIds: [pair.entityIds[0], pair.entityIds[1]],
    distinctSuccessDays: pair.distinctSuccessDays,
    updatedAt: pair.updatedAt,
    ...(pair.lastOutcome ? { lastOutcome: pair.lastOutcome } : {}),
    ...(pair.card ? { card: serializeCard(pair.card) } : {})
  };
}

function deserializePairState(
  pair: BrunankiExport["pairStates"][number]
): PairState {
  const card = deserializeCard(pair.card);
  return {
    id: pair.id,
    entityIds: pair.entityIds,
    distinctSuccessDays: pair.distinctSuccessDays,
    updatedAt: pair.updatedAt,
    ...(pair.lastOutcome ? { lastOutcome: pair.lastOutcome } : {}),
    ...(card ? { card } : {})
  };
}

function deserializeSkillState(
  state: BrunankiExport["skillStates"][number]
): SkillState {
  const card = deserializeCard(state.card);
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
  const [skillStates, attempts, pairStates, settingsRecord] = await Promise.all(
    [
      db.skillStates.toArray(),
      db.attempts.toArray(),
      db.pairStates.toArray(),
      db.appSettings.get(SINGLETON_KEY)
    ]
  );
  const settings: AppSettings = completeAppSettings(settingsRecord?.settings);

  return brunankiExportSchema.parse({
    format: EXPORT_FORMAT,
    schemaVersion: EXPORT_SCHEMA_VERSION,
    catalogVersion,
    exportedAt: now.toISOString(),
    settings,
    skillStates: skillStates.map(serializeSkillState),
    attempts,
    pairStates: pairStates.map(serializePairState)
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
  if (
    typeof raw === "object" &&
    raw !== null &&
    "format" in raw &&
    raw.format === EXPORT_FORMAT &&
    "schemaVersion" in raw &&
    typeof raw.schemaVersion === "number" &&
    raw.schemaVersion < EXPORT_SCHEMA_VERSION
  ) {
    throw new IncompatibleBackupError(raw.schemaVersion);
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
  for (const pair of data.pairStates) {
    for (const id of pair.entityIds) referenced.add(id);
  }

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
  const pairs = data.pairStates.map(deserializePairState);

  await db.transaction(
    "rw",
    db.skillStates,
    db.attempts,
    db.pairStates,
    db.appSettings,
    async () => {
      await Promise.all([
        db.skillStates.clear(),
        db.attempts.clear(),
        db.pairStates.clear(),
        db.appSettings.clear()
      ]);
      await db.skillStates.bulkAdd(states);
      await db.attempts.bulkAdd(data.attempts as ReviewAttempt[]);
      await db.pairStates.bulkAdd(pairs);
      await db.appSettings.add({
        id: SINGLETON_KEY,
        settings: data.settings
      });
    }
  );
}
