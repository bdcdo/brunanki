"use client";

import type { LearningSnapshot } from "@/types/learning";

import {
  completeAppSettings,
  SINGLETON_KEY,
  getDatabase,
  type BrunankiDatabase
} from "./database";
import { downloadBackupFile } from "./backup-file";
import {
  applyPreparedImport,
  prepareImport,
  serializeDatabaseExport,
  type ImportTarget,
  type BrunankiExport
} from "./export";

export type { LearningSnapshot };

export async function readLearningSnapshot(
  db: BrunankiDatabase = getDatabase()
): Promise<LearningSnapshot> {
  const [skillStates, attempts, pairStates, settingsRecord] = await Promise.all(
    [
      db.skillStates.toArray(),
      db.attempts.orderBy("createdAt").toArray(),
      db.pairStates.toArray(),
      db.appSettings.get(SINGLETON_KEY)
    ]
  );
  return {
    skills: skillStates,
    attempts,
    pairs: pairStates,
    settings: completeAppSettings(settingsRecord?.settings)
  };
}

export async function resetAllData(
  db: BrunankiDatabase = getDatabase()
): Promise<void> {
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
    }
  );
}

export async function exportProgress(
  catalogVersion: string,
  db: BrunankiDatabase = getDatabase()
): Promise<string> {
  return serializeDatabaseExport(db, catalogVersion);
}

export interface ImportProgressOptions {
  saveBackup: (backupJson: string) => void | Promise<void>;
  confirmReplace: (incoming: BrunankiExport) => boolean | Promise<boolean>;
}

export async function importProgress(
  json: string,
  target: ImportTarget,
  options?: ImportProgressOptions,
  db: BrunankiDatabase = getDatabase()
): Promise<boolean> {
  const prepared = await prepareImport(db, json, target);
  const handlers = options ?? browserImportHandlers();
  await handlers.saveBackup(prepared.backupJson);
  if (!(await handlers.confirmReplace(prepared.data))) return false;
  await applyPreparedImport(db, prepared);
  return true;
}

function browserImportHandlers(): ImportProgressOptions {
  if (
    typeof window === "undefined" ||
    typeof document === "undefined" ||
    typeof window.confirm !== "function"
  ) {
    throw new Error(
      "A importação exige callbacks saveBackup e confirmReplace fora do navegador"
    );
  }
  return {
    saveBackup(backupJson) {
      downloadBackupFile(backupJson);
    },
    confirmReplace() {
      return window.confirm(
        "Substituir todo o progresso atual pelos dados deste backup?"
      );
    }
  };
}
