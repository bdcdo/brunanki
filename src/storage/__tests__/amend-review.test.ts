import "fake-indexeddb/auto";

import { afterEach, describe, expect, it } from "vitest";

import type { ReviewAttempt, SkillState } from "@/types/learning";

import { BrunankiDatabase, amendReview, saveReview } from "../database";

const open: BrunankiDatabase[] = [];

function freshDatabase(): BrunankiDatabase {
  const db = new BrunankiDatabase(`amend-${crypto.randomUUID()}`);
  open.push(db);
  return db;
}

afterEach(async () => {
  await Promise.all(open.splice(0).map((db) => db.delete()));
});

const state: SkillState = {
  id: "per::nameToFlagRecognition",
  entityId: "per",
  skill: "nameToFlagRecognition",
  phase: "acquiring",
  distinctSuccessDays: ["2026-09-24"],
  lastOutcome: "correct",
  updatedAt: "2026-09-24T12:00:00.000Z"
};

const attempt: ReviewAttempt = {
  id: "a1",
  entityId: "per",
  skill: "nameToFlagRecognition",
  exercise: "nameToFlagChoice",
  outcome: "correct",
  isImmediateCorrection: false,
  mode: "scheduled",
  awardedXp: 1,
  responseMs: 1200,
  firstInputMs: 1200,
  createdAt: "2026-09-24T12:00:00.000Z"
};

describe("amendReview", () => {
  it("substitui a tentativa e o estado, sem somar uma segunda tentativa", async () => {
    const db = freshDatabase();
    await saveReview(state, attempt, db);

    const guessed = { ...attempt, guessed: true, awardedXp: 0 as const };
    const regraded = { ...state, distinctSuccessDays: [] };
    await amendReview(regraded, guessed, db);

    expect(await db.attempts.toArray()).toEqual([guessed]);
    expect(await db.skillStates.get(state.id)).toEqual(regraded);
  });

  it("recusa reescrever tentativa que não foi gravada", async () => {
    const db = freshDatabase();
    await expect(amendReview(state, attempt, db)).rejects.toThrow(/já gravada/);
    expect(await db.attempts.count()).toBe(0);
    expect(await db.skillStates.count()).toBe(0);
  });

  it("recusa reescrever a tentativa como sendo de outra bandeira", async () => {
    const db = freshDatabase();
    await saveReview(state, attempt, db);
    const other = {
      ...state,
      id: "chl::nameToFlagRecognition",
      entityId: "chl"
    };
    await expect(
      amendReview(other, { ...attempt, entityId: "chl" }, db)
    ).rejects.toThrow(/outra bandeira/);
    await expect(
      amendReview(state, { ...attempt, exercise: "flagToNameChoice" }, db)
    ).rejects.toThrow(/outra bandeira/);
    expect(await db.attempts.toArray()).toEqual([attempt]);
  });

  it("recusa estado de outra bandeira", async () => {
    const db = freshDatabase();
    await saveReview(state, attempt, db);
    await expect(
      amendReview({ ...state, entityId: "chl" }, attempt, db)
    ).rejects.toThrow(/não correspondem/);
  });

  it("recusa reescrever a tentativa como sendo de outra direção", async () => {
    const db = freshDatabase();
    await saveReview(state, attempt, db);
    const recall = {
      ...state,
      id: "per::flagToNameRecall",
      skill: "flagToNameRecall" as const
    };
    await expect(
      amendReview(recall, { ...attempt, skill: "flagToNameRecall" }, db)
    ).rejects.toThrow(/outra bandeira/);
  });

  it("recusa estado de outra habilidade", async () => {
    const db = freshDatabase();
    await saveReview(state, attempt, db);
    await expect(
      amendReview({ ...state, skill: "flagToNameRecall" }, attempt, db)
    ).rejects.toThrow(/não correspondem/);
  });
});
