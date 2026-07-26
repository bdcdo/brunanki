import { describe, expect, it } from "vitest";

import {
  EXPORT_FORMAT,
  EXPORT_SCHEMA_VERSION,
  parseExportJson
} from "../export";

function validExport() {
  return {
    format: EXPORT_FORMAT,
    schemaVersion: EXPORT_SCHEMA_VERSION,
    catalogVersion: "2026-07-25",
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
      catalogVersion: "2026-07-25"
    });
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
