import "fake-indexeddb/auto";

import { afterEach, describe, expect, it } from "vitest";
import { createEmptyCard, fsrs, Rating, type Card } from "ts-fsrs";

import type { ReviewAttempt, SkillState } from "@/types/learning";

import { BrunankiDatabase, SINGLETON_KEY } from "../database";
import {
  applyPreparedImport,
  prepareImport,
  serializeDatabaseExport,
  type ImportTarget
} from "../export";

const openDatabases: BrunankiDatabase[] = [];

function freshDatabase(): BrunankiDatabase {
  const db = new BrunankiDatabase(`roundtrip-${crypto.randomUUID()}`);
  openDatabases.push(db);
  return db;
}

afterEach(async () => {
  await Promise.all(openDatabases.splice(0).map((db) => db.delete()));
});

const now = new Date("2026-09-24T12:00:00.000Z");

/**
 * Um cartão que passou por duas revisões tem `last_review` e `due` como Date.
 * É esse o caso que o JSON perde se a (de)serialização esquecer de converter:
 * a data volta como string, e o agendador compara string com Date.
 */
function reviewedCard(): Card {
  const scheduler = fsrs({ enable_fuzz: false });
  const first = scheduler.next(
    createEmptyCard(new Date("2026-09-20T12:00:00.000Z")),
    new Date("2026-09-20T12:00:00.000Z"),
    Rating.Good
  ).card;
  return scheduler.next(
    first,
    new Date("2026-09-22T12:00:00.000Z"),
    Rating.Good
  ).card;
}

async function seed(db: BrunankiDatabase): Promise<void> {
  const reviewed: SkillState = {
    id: "bra::flagToNameRecall",
    entityId: "bra",
    skill: "flagToNameRecall",
    phase: "scheduled",
    card: reviewedCard(),
    distinctSuccessDays: ["2026-09-20", "2026-09-22"],
    lastOutcome: "correct",
    updatedAt: "2026-09-22T12:00:00.000Z"
  };
  const unseen: SkillState = {
    id: "chl::nameToFlagRecognition",
    entityId: "chl",
    skill: "nameToFlagRecognition",
    phase: "unseen",
    distinctSuccessDays: [],
    updatedAt: "2026-09-20T12:00:00.000Z"
  };
  const attempt: ReviewAttempt = {
    id: "a1",
    entityId: "bra",
    skill: "flagToNameRecall",
    exercise: "flagToNameInput",
    outcome: "correct",
    isImmediateCorrection: false,
    responseMs: 1800,
    createdAt: "2026-09-22T12:00:00.000Z"
  };
  await db.skillStates.bulkAdd([reviewed, unseen]);
  await db.attempts.add(attempt);
  await db.appSettings.add({
    id: SINGLETON_KEY,
    settings: { desiredRetention: 0.85, timeZone: "America/Sao_Paulo" }
  });
}

const target: ImportTarget = {
  catalogVersion: "2026.09.24",
  knownEntityIds: new Set(["bra", "chl"])
};

describe("backup de ida e volta", () => {
  it("restaura num banco vazio o mesmo estado que foi exportado", async () => {
    const source = freshDatabase();
    await seed(source);
    const exported = await serializeDatabaseExport(
      source,
      target.catalogVersion,
      now
    );

    const destination = freshDatabase();
    const prepared = await prepareImport(destination, exported, target, now);
    await applyPreparedImport(destination, prepared);

    expect(
      await serializeDatabaseExport(destination, target.catalogVersion, now)
    ).toBe(exported);
  });

  it("devolve as datas do cartão como Date, e não como texto", async () => {
    const source = freshDatabase();
    await seed(source);
    const exported = await serializeDatabaseExport(
      source,
      target.catalogVersion,
      now
    );

    const destination = freshDatabase();
    await applyPreparedImport(
      destination,
      await prepareImport(destination, exported, target, now)
    );

    const restored = await destination.skillStates.get("bra::flagToNameRecall");
    expect(restored?.card?.due).toBeInstanceOf(Date);
    expect(restored?.card?.last_review).toBeInstanceOf(Date);
    const original = reviewedCard();
    expect(restored?.card?.due.getTime()).toBe(original.due.getTime());
  });

  it("substitui o estado existente em vez de somar a ele", async () => {
    const source = freshDatabase();
    await seed(source);
    const exported = await serializeDatabaseExport(
      source,
      target.catalogVersion,
      now
    );

    const destination = freshDatabase();
    await destination.attempts.add({
      id: "antiga",
      entityId: "chl",
      skill: "nameToFlagRecognition",
      exercise: "nameToFlagChoice",
      outcome: "incorrect",
      isImmediateCorrection: false,
      responseMs: 4000,
      createdAt: "2026-09-01T12:00:00.000Z"
    });
    await applyPreparedImport(
      destination,
      await prepareImport(destination, exported, target, now)
    );

    expect((await destination.attempts.toArray()).map((a) => a.id)).toEqual([
      "a1"
    ]);
  });
});
