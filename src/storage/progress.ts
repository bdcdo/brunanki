"use client";

import type {
  AttemptOutcome,
  DiagnosticState,
  ReviewAttempt,
  SkillState
} from "@/types/learning";
import { catalog } from "@/data/catalog";

import {
  advanceDiagnostic,
  currentDiagnosticEntity,
  startDiagnostic
} from "@/domain/diagnostic";
import {
  createSkillState,
  scheduleAttempt,
  skillStateId
} from "@/domain/scheduler";

import {
  DEFAULT_APP_SETTINGS,
  SINGLETON_KEY,
  getDatabase,
  type PtankiDatabase
} from "./database";
import {
  applyPreparedImport,
  prepareImport,
  serializeDatabaseExport,
  type PtankiExport
} from "./export";

export interface LearningSnapshot {
  skills: SkillState[];
  attempts: ReviewAttempt[];
  diagnostic?: DiagnosticState;
  settings: typeof DEFAULT_APP_SETTINGS;
}

export async function readLearningSnapshot(
  db: PtankiDatabase = getDatabase()
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
    settings: settingsRecord?.settings ?? DEFAULT_APP_SETTINGS
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
  db: PtankiDatabase = getDatabase(),
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

function newAttemptId(): string {
  if (typeof globalThis.crypto?.randomUUID !== "function") {
    throw new Error("Este navegador não oferece crypto.randomUUID()");
  }
  return globalThis.crypto.randomUUID();
}

export async function saveDiagnosticAnswer(
  input: SaveDiagnosticAnswerInput,
  db: PtankiDatabase = getDatabase()
): Promise<SavedDiagnosticAnswer> {
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
    responseMs: input.responseMs,
    ...(input.answer !== undefined ? { answer: input.answer } : {}),
    createdAt: createdAt.toISOString()
  };
  const id = skillStateId(input.entityId, "flagToNameRecall");
  const currentState =
    (await db.skillStates.get(id)) ??
    createSkillState(input.entityId, "flagToNameRecall", createdAt);
  const skillState = scheduleAttempt(currentState, attempt);
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
  db: PtankiDatabase = getDatabase()
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
  catalogVersion: string = catalog.version,
  db: PtankiDatabase = getDatabase()
): Promise<string> {
  return serializeDatabaseExport(db, catalogVersion);
}

export interface ImportProgressOptions {
  saveBackup: (backupJson: string) => void | Promise<void>;
  confirmReplace: (incoming: PtankiExport) => boolean | Promise<boolean>;
}

export async function importProgress(
  json: string,
  currentCatalogVersion: string = catalog.version,
  options?: ImportProgressOptions,
  db: PtankiDatabase = getDatabase()
): Promise<boolean> {
  const prepared = await prepareImport(db, json, currentCatalogVersion);
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
      const blob = new Blob([backupJson], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `ptanki-backup-${new Date()
        .toISOString()
        .slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    },
    confirmReplace() {
      return window.confirm(
        "Substituir todo o progresso atual pelos dados deste backup?"
      );
    }
  };
}
