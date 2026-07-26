import { describe, expect, it } from "vitest";

import {
  EXPORT_FORMAT,
  EXPORT_SCHEMA_VERSION,
  UnknownEntitiesError,
  parseExportJson,
  prepareImport,
  type ImportTarget
} from "../export";
import type { PtankiDatabase } from "../database";

function validExport() {
  return {
    format: EXPORT_FORMAT,
    schemaVersion: EXPORT_SCHEMA_VERSION,
    catalogVersion: "2026.07.25",
    exportedAt: "2026-07-25T12:00:00.000Z",
    settings: { desiredRetention: 0.9, reduceMotion: false },
    skillStates: [
      {
        id: "brasil::flagToNameRecall",
        entityId: "brasil",
        skill: "flagToNameRecall",
        phase: "unseen",
        distinctSuccessDays: [],
        updatedAt: "2026-07-25T12:00:00.000Z"
      }
    ],
    attempts: []
  };
}

describe("parseExportJson", () => {
  it("aceita um backup versionado e bem formado", () => {
    expect(parseExportJson(JSON.stringify(validExport()))).toMatchObject({
      format: "ptanki-export",
      schemaVersion: 1,
      catalogVersion: "2026.07.25"
    });
  });

  it("rejeita versão de catálogo fora do formato AAAA.MM.DD", () => {
    // O catálogo real grava "2026.07.25"; a forma com hífen não é aceita para
    // que um backup de outra origem não passe como string opaca.
    const data = { ...validExport(), catalogVersion: "2026-07-25" };
    expect(() => parseExportJson(JSON.stringify(data))).toThrow();
  });

  it("rejeita estado cujo ID não corresponde ao contrato entidade×habilidade", () => {
    const data = validExport();
    data.skillStates[0].id = "outro-id";
    expect(() => parseExportJson(JSON.stringify(data))).toThrow();
  });

  it("rejeita diagnóstico concluído antes de percorrer todas as entidades", () => {
    const data = {
      ...validExport(),
      diagnosticState: {
        entityOrder: ["brasil", "chile"],
        currentIndex: 1,
        startedAt: "2026-07-25T10:00:00.000Z",
        completedAt: "2026-07-25T11:00:00.000Z"
      }
    };
    expect(() => parseExportJson(JSON.stringify(data))).toThrow();
  });

  it("explica JSON sintaticamente inválido", () => {
    expect(() => parseExportJson("{")).toThrow(
      "O arquivo não contém JSON válido"
    );
  });
});

/**
 * `prepareImport` só lê o banco para produzir o backup de segurança; um duplo
 * com tabelas vazias basta para exercitar o gate de compatibilidade.
 */
function emptyDatabase() {
  const emptyTable = { toArray: async () => [] };
  const singleton = { get: async () => undefined };
  return {
    skillStates: emptyTable,
    attempts: emptyTable,
    diagnostics: singleton,
    appSettings: singleton
  } as unknown as PtankiDatabase;
}

describe("prepareImport", () => {
  const target: ImportTarget = {
    catalogVersion: "2026.08.01",
    knownEntityIds: new Set(["brasil", "chile"])
  };

  it("aceita backup de outra versão de catálogo quando as entidades existem", async () => {
    // O backup declara 2026.07.25 e o alvo é 2026.08.01: antes isso era
    // rejeitado, e todo `data:refresh` invalidava os backups existentes.
    const prepared = await prepareImport(
      emptyDatabase(),
      JSON.stringify(validExport()),
      target
    );
    expect(prepared.data.catalogVersion).toBe("2026.07.25");
  });

  it("rejeita backup que referencia entidade ausente do catálogo", async () => {
    const data = validExport();
    data.skillStates[0].id = "atlantida::flagToNameRecall";
    data.skillStates[0].entityId = "atlantida";

    await expect(
      prepareImport(emptyDatabase(), JSON.stringify(data), target)
    ).rejects.toThrow(UnknownEntitiesError);
  });

  it("lista as entidades desconhecidas encontradas", async () => {
    const data = {
      ...validExport(),
      diagnosticState: {
        entityOrder: ["brasil", "lemuria"],
        currentIndex: 0,
        startedAt: "2026-07-25T10:00:00.000Z"
      }
    };

    await expect(
      prepareImport(emptyDatabase(), JSON.stringify(data), target)
    ).rejects.toThrow(/lemuria/);
  });
});
