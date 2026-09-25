import "fake-indexeddb/auto";

import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";

import { BrunankiDatabase, SINGLETON_KEY, getAppSettings } from "../database";

const names: string[] = [];

afterEach(async () => {
  await Promise.all(names.splice(0).map((name) => Dexie.delete(name)));
});

/**
 * Grava um banco como a versão 2 do app o deixava: com diagnóstico, progresso
 * e preferências sem continente ativo. O esquema é repetido aqui de propósito,
 * e não importado: é o formato de um banco que já existe em algum navegador,
 * e ele não muda quando o código muda.
 */
async function seedVersion2(name: string): Promise<void> {
  const legacy = new Dexie(name);
  legacy.version(2).stores({
    skillStates: "id, entityId, skill, phase, updatedAt, [entityId+skill]",
    attempts:
      "id, entityId, skill, exercise, outcome, createdAt, [entityId+skill]",
    diagnostics: "id",
    appSettings: "id"
  });
  await legacy.open();
  await legacy.table("skillStates").add({
    id: "bra::flagToNameRecall",
    entityId: "bra",
    skill: "flagToNameRecall",
    phase: "acquiring",
    distinctSuccessDays: [],
    updatedAt: "2026-09-01T12:00:00.000Z"
  });
  await legacy.table("attempts").add({
    id: "velha",
    entityId: "bra",
    skill: "flagToNameRecall",
    exercise: "diagnostic",
    outcome: "correct",
    isImmediateCorrection: false,
    responseMs: 900,
    createdAt: "2026-09-01T12:00:00.000Z"
  });
  await legacy.table("diagnostics").add({
    id: SINGLETON_KEY,
    state: {
      entityOrder: ["bra"],
      currentIndex: 1,
      startedAt: "2026-09-01T11:00:00.000Z"
    }
  });
  await legacy.table("appSettings").add({
    id: SINGLETON_KEY,
    settings: { desiredRetention: 0.85, timeZone: "America/Sao_Paulo" }
  });
  legacy.close();
}

describe("atualização do banco para a versão do piloto", () => {
  it("zera o progresso, apaga o diagnóstico e preserva as preferências", async () => {
    const name = `upgrade-${crypto.randomUUID()}`;
    names.push(name);
    await seedVersion2(name);

    const db = new BrunankiDatabase(name);
    await db.open();

    expect(await db.skillStates.count()).toBe(0);
    expect(await db.attempts.count()).toBe(0);
    expect(await db.pairStates.count()).toBe(0);
    expect(db.tables.map(({ name: table }) => table)).not.toContain(
      "diagnostics"
    );
    // A preferência antiga chega sem continente, e a leitura o completa em
    // vez de exigir uma segunda migração.
    expect(await getAppSettings(db)).toEqual({
      desiredRetention: 0.85,
      timeZone: "America/Sao_Paulo",
      activeContinent: "americas"
    });
    db.close();
  });
});
