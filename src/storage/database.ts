"use client";

import Dexie, { type EntityTable } from "dexie";

import type {
  AppSettings,
  DiagnosticState,
  ReviewAttempt,
  SkillState
} from "@/types/learning";

import { defaultSchedulingPreferences } from "@/domain/scheduler";

export const DATABASE_NAME = "brunanki";
export const SINGLETON_KEY = "current";

export interface DiagnosticRecord {
  id: typeof SINGLETON_KEY;
  state: DiagnosticState;
}

export interface SettingsRecord {
  id: typeof SINGLETON_KEY;
  settings: AppSettings;
}

/**
 * O fuso é lido do dispositivo na primeira vez que as preferências são
 * necessárias, e não fixado no módulo, para que o valor gravado seja o de
 * quem está estudando.
 */
export function defaultAppSettings(): AppSettings {
  return defaultSchedulingPreferences();
}

export class BrunankiDatabase extends Dexie {
  skillStates!: EntityTable<SkillState, "id">;
  attempts!: EntityTable<ReviewAttempt, "id">;
  diagnostics!: EntityTable<DiagnosticRecord, "id">;
  appSettings!: EntityTable<SettingsRecord, "id">;

  constructor(name: string = DATABASE_NAME) {
    super(name);
    this.version(1).stores({
      skillStates: "id, entityId, skill, phase, updatedAt, [entityId+skill]",
      attempts:
        "id, entityId, skill, exercise, outcome, createdAt, [entityId+skill]",
      diagnostics: "id",
      appSettings: "id"
    });
    // O catálogo encolheu de 220 para 195 entidades, e o progresso guardado
    // referencia entidades por ID. Nada aqui filtrava esse estado contra o
    // catálogo — `readLearningSnapshot` devolve o que o Dexie tem, cru —,
    // então as linhas órfãs vazariam para o domínio: a fila de estudo
    // entregaria um item cuja entidade não existe, e `StudySession` o leria
    // como fim de sessão; pior, o diagnóstico pararia num cartão em branco,
    // sem botão de avançar e sem saída pela interface.
    //
    // O reset é a correção certa aqui, e não uma poda seletiva, porque o
    // progresso já vai ser zerado quando o backend entrar. Reconciliar item a
    // item seria construir uma máquina para descartá-la em seguida.
    //
    // `appSettings` sobrevive de propósito: retenção desejada e fuso não
    // referenciam entidade nenhuma, e perdê-los seria dano sem motivo.
    this.version(2)
      .stores({})
      .upgrade((transaction) =>
        Promise.all([
          transaction.table("skillStates").clear(),
          transaction.table("attempts").clear(),
          transaction.table("diagnostics").clear()
        ])
      );
  }
}

let database: BrunankiDatabase | undefined;

export function getDatabase(): BrunankiDatabase {
  database ??= new BrunankiDatabase();
  return database;
}

export async function getDiagnosticState(
  db: BrunankiDatabase = getDatabase()
): Promise<DiagnosticState | undefined> {
  return (await db.diagnostics.get(SINGLETON_KEY))?.state;
}

export async function saveDiagnosticState(
  state: DiagnosticState,
  db: BrunankiDatabase = getDatabase()
): Promise<void> {
  await db.diagnostics.put({ id: SINGLETON_KEY, state });
}

export async function clearDiagnosticState(
  db: BrunankiDatabase = getDatabase()
): Promise<void> {
  await db.diagnostics.delete(SINGLETON_KEY);
}

export async function getAppSettings(
  db: BrunankiDatabase = getDatabase()
): Promise<AppSettings> {
  return (
    (await db.appSettings.get(SINGLETON_KEY))?.settings ?? defaultAppSettings()
  );
}

export async function saveAppSettings(
  settings: AppSettings,
  db: BrunankiDatabase = getDatabase()
): Promise<void> {
  if (
    !Number.isFinite(settings.desiredRetention) ||
    settings.desiredRetention <= 0 ||
    settings.desiredRetention > 1
  ) {
    throw new RangeError("desiredRetention deve estar no intervalo (0, 1]");
  }
  await db.appSettings.put({ id: SINGLETON_KEY, settings });
}

export async function saveReview(
  state: SkillState,
  attempt: ReviewAttempt,
  db: BrunankiDatabase = getDatabase()
): Promise<void> {
  if (state.entityId !== attempt.entityId || state.skill !== attempt.skill) {
    throw new Error("Tentativa e estado de habilidade não correspondem");
  }
  await db.transaction("rw", db.skillStates, db.attempts, async () => {
    await db.skillStates.put(state);
    await db.attempts.add(attempt);
  });
}
