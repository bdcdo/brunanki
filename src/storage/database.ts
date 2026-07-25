"use client";

import Dexie, { type EntityTable } from "dexie";

import type {
  AppSettings,
  DiagnosticState,
  ReviewAttempt,
  SkillState,
} from "@/types/learning";

import { DEFAULT_DESIRED_RETENTION } from "@/domain/scheduler";

export const DATABASE_NAME = "ptanki";
export const SINGLETON_KEY = "current";

export interface DiagnosticRecord {
  id: typeof SINGLETON_KEY;
  state: DiagnosticState;
}

export interface SettingsRecord {
  id: typeof SINGLETON_KEY;
  settings: AppSettings;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  desiredRetention: DEFAULT_DESIRED_RETENTION,
  reduceMotion: false,
};

export class PtankiDatabase extends Dexie {
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
      appSettings: "id",
    });
  }
}

let database: PtankiDatabase | undefined;

export function getDatabase(): PtankiDatabase {
  database ??= new PtankiDatabase();
  return database;
}

export async function getDiagnosticState(
  db: PtankiDatabase = getDatabase(),
): Promise<DiagnosticState | undefined> {
  return (await db.diagnostics.get(SINGLETON_KEY))?.state;
}

export async function saveDiagnosticState(
  state: DiagnosticState,
  db: PtankiDatabase = getDatabase(),
): Promise<void> {
  await db.diagnostics.put({ id: SINGLETON_KEY, state });
}

export async function clearDiagnosticState(
  db: PtankiDatabase = getDatabase(),
): Promise<void> {
  await db.diagnostics.delete(SINGLETON_KEY);
}

export async function getAppSettings(
  db: PtankiDatabase = getDatabase(),
): Promise<AppSettings> {
  return (
    (await db.appSettings.get(SINGLETON_KEY))?.settings ??
    DEFAULT_APP_SETTINGS
  );
}

export async function saveAppSettings(
  settings: AppSettings,
  db: PtankiDatabase = getDatabase(),
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
  db: PtankiDatabase = getDatabase(),
): Promise<void> {
  if (state.entityId !== attempt.entityId || state.skill !== attempt.skill) {
    throw new Error("Tentativa e estado de habilidade não correspondem");
  }
  await db.transaction("rw", db.skillStates, db.attempts, async () => {
    await db.skillStates.put(state);
    await db.attempts.add(attempt);
  });
}
