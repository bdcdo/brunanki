"use client";

import type {
  AttemptOutcome,
  DiagnosticState,
  LearningSnapshot,
  ReviewAttempt,
  SkillState
} from "@/types/learning";

import {
  advanceDiagnostic,
  currentDiagnosticEntity,
  startDiagnostic
} from "@/domain/diagnostic";
import { newAttemptId } from "@/domain/ids";
import {
  createSkillState,
  scheduleAttempt,
  skillStateId
} from "@/domain/scheduler";

import {
  defaultAppSettings,
  getAppSettings,
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
  const [skillStates, attempts, diagnosticRecord, settingsRecord] =
    await Promise.all([
      db.skillStates.toArray(),
      db.attempts.orderBy("createdAt").toArray(),
      db.diagnostics.get(SINGLETON_KEY),
      db.appSettings.get(SINGLETON_KEY)
    ]);
  return {
    skills: skillStates,
    attempts,
    ...(diagnosticRecord ? { diagnostic: diagnosticRecord.state } : {}),
    settings: settingsRecord?.settings ?? defaultAppSettings()
  };
}

function sameEntitySet(
  existingOrder: readonly string[],
  requestedIds: readonly string[]
): boolean {
  return (
    existingOrder.length === requestedIds.length &&
    new Set(existingOrder).size === existingOrder.length &&
    requestedIds.every((id) => existingOrder.includes(id))
  );
}

export async function startOrResumeDiagnostic(
  entityIds: readonly string[],
  db: BrunankiDatabase = getDatabase(),
  now: Date = new Date()
): Promise<DiagnosticState> {
  const existing = (await db.diagnostics.get(SINGLETON_KEY))?.state;
  if (existing) {
    if (!sameEntitySet(existing.entityOrder, entityIds)) {
      throw new Error(
        "O diagnóstico salvo pertence a outra versão do catálogo; redefina-o antes de iniciar"
      );
    }
    return existing;
  }

  const state = startDiagnostic(entityIds, now);
  await db.diagnostics.add({ id: SINGLETON_KEY, state });
  return state;
}

export interface SaveDiagnosticAnswerInput {
  entityId: string;
  outcome: AttemptOutcome;
  responseMs: number;
  answer?: string;
  createdAt?: Date;
  attemptId?: string;
}

export interface SavedDiagnosticAnswer {
  skillState: SkillState;
  attempt: ReviewAttempt;
  diagnosticState: DiagnosticState;
}

export async function saveDiagnosticAnswer(
  input: SaveDiagnosticAnswerInput,
  db: BrunankiDatabase = getDatabase()
): Promise<SavedDiagnosticAnswer> {
  const preferences = await getAppSettings(db);
  if (!Number.isInteger(input.responseMs) || input.responseMs < 0) {
    throw new RangeError("responseMs deve ser um inteiro não negativo");
  }
  const diagnosticRecord = await db.diagnostics.get(SINGLETON_KEY);
  if (!diagnosticRecord) {
    throw new Error("Não há diagnóstico em andamento");
  }
  const expectedEntityId = currentDiagnosticEntity(diagnosticRecord.state);
  if (!expectedEntityId) {
    throw new Error("O diagnóstico já foi concluído");
  }
  if (expectedEntityId !== input.entityId) {
    throw new Error(
      `A resposta é de ${input.entityId}, mas o item atual é ${expectedEntityId}`
    );
  }

  const createdAt = input.createdAt ?? new Date();
  const attempt: ReviewAttempt = {
    id: input.attemptId ?? newAttemptId(),
    entityId: input.entityId,
    skill: "flagToNameRecall",
    exercise: "diagnostic",
    outcome: input.outcome,
    // O diagnóstico é a primeira passada por cada bandeira: nunca é a
    // repetição imediata que se segue a um erro.
    isImmediateCorrection: false,
    responseMs: input.responseMs,
    ...(input.answer !== undefined ? { answer: input.answer } : {}),
    createdAt: createdAt.toISOString()
  };
  const id = skillStateId(input.entityId, "flagToNameRecall");
  const currentState =
    (await db.skillStates.get(id)) ??
    createSkillState(input.entityId, "flagToNameRecall", createdAt);
  const skillState = scheduleAttempt(currentState, attempt, preferences);
  const diagnosticState = advanceDiagnostic(diagnosticRecord.state, createdAt);

  await db.transaction(
    "rw",
    db.skillStates,
    db.attempts,
    db.diagnostics,
    async () => {
      await db.skillStates.put(skillState);
      await db.attempts.add(attempt);
      await db.diagnostics.put({
        id: SINGLETON_KEY,
        state: diagnosticState
      });
    }
  );

  return { skillState, attempt, diagnosticState };
}

export async function resetAllData(
  db: BrunankiDatabase = getDatabase()
): Promise<void> {
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
