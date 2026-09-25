import "fake-indexeddb/auto";

import { afterEach, describe, expect, it } from "vitest";

import { BrunankiDatabase, SINGLETON_KEY } from "../database";
import { readLearningSnapshot, resetAllData } from "../progress";

const open: BrunankiDatabase[] = [];

function freshDatabase(): BrunankiDatabase {
  const db = new BrunankiDatabase(`progress-${crypto.randomUUID()}`);
  open.push(db);
  return db;
}

afterEach(async () => {
  await Promise.all(open.splice(0).map((db) => db.delete()));
});

async function seed(db: BrunankiDatabase): Promise<void> {
  await db.skillStates.add({
    id: "bra::flagToNameRecall",
    entityId: "bra",
    skill: "flagToNameRecall",
    phase: "acquiring",
    distinctSuccessDays: [],
    updatedAt: "2026-09-24T12:00:00.000Z"
  });
  await db.attempts.add({
    id: "a1",
    entityId: "bra",
    skill: "flagToNameRecall",
    exercise: "flagToNameInput",
    outcome: "correct",
    isImmediateCorrection: false,
    mode: "scheduled",
    awardedXp: 1,
    responseMs: 900,
    createdAt: "2026-09-24T12:00:00.000Z"
  });
  await db.pairStates.add({
    id: "bra|chl",
    entityIds: ["bra", "chl"],
    distinctSuccessDays: [],
    updatedAt: "2026-09-24T12:00:00.000Z"
  });
  await db.appSettings.add({
    id: SINGLETON_KEY,
    settings: {
      desiredRetention: 0.9,
      timeZone: "America/Sao_Paulo",
      activeContinent: "americas"
    }
  });
}

describe("readLearningSnapshot", () => {
  it("lê habilidades, tentativas, pares e preferências numa passada", async () => {
    const db = freshDatabase();
    await seed(db);
    const snapshot = await readLearningSnapshot(db);
    expect(snapshot.skills.map(({ id }) => id)).toEqual([
      "bra::flagToNameRecall"
    ]);
    expect(snapshot.attempts.map(({ id }) => id)).toEqual(["a1"]);
    expect(snapshot.pairs.map(({ id }) => id)).toEqual(["bra|chl"]);
    expect(snapshot.settings.activeContinent).toBe("americas");
  });

  it("completa as preferências de um perfil sem nenhuma gravada", async () => {
    const snapshot = await readLearningSnapshot(freshDatabase());
    expect(snapshot.settings.activeContinent).toBe("americas");
    expect(snapshot.pairs).toEqual([]);
  });
});

describe("resetAllData", () => {
  it("apaga as quatro tabelas, inclusive os pares", async () => {
    const db = freshDatabase();
    await seed(db);
    await resetAllData(db);
    expect(await db.skillStates.count()).toBe(0);
    expect(await db.attempts.count()).toBe(0);
    expect(await db.pairStates.count()).toBe(0);
    expect(await db.appSettings.count()).toBe(0);
  });
});
