import { describe, expect, it } from "vitest";

import {
  EXPORT_FORMAT,
  EXPORT_SCHEMA_VERSION,
  IncompatibleBackupError,
  UnknownEntitiesError,
  parseExportJson,
  prepareImport,
  type ImportTarget
} from "../export";
import type { BrunankiDatabase } from "../database";

function validExport() {
  return {
    format: EXPORT_FORMAT,
    schemaVersion: EXPORT_SCHEMA_VERSION,
    catalogVersion: "2026.07.25",
    exportedAt: "2026-07-25T12:00:00.000Z",
    settings: {
      desiredRetention: 0.9,
      timeZone: "America/Sao_Paulo",
      activeContinent: "americas"
    },
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
    attempts: [],
    pairStates: [] as {
      id: string;
      entityIds: [string, string];
      distinctSuccessDays: string[];
      updatedAt: string;
    }[]
  };
}

function exportWithAttempt(exercise: string) {
  return {
    ...validExport(),
    attempts: [
      {
        id: "a1",
        entityId: "brasil",
        skill: "flagToNameRecall",
        exercise,
        outcome: "correct",
        isImmediateCorrection: false,
        mode: "scheduled",
        awardedXp: 1,
        responseMs: 900,
        createdAt: "2026-07-25T12:00:00.000Z"
      }
    ]
  };
}

describe("parseExportJson", () => {
  it("aceita um backup versionado e bem formado", () => {
    expect(parseExportJson(JSON.stringify(validExport()))).toMatchObject({
      format: "brunanki-export",
      schemaVersion: 3,
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

  it("aceita par na forma canônica e recusa o mesmo par invertido", () => {
    const pair = {
      id: "brasil|chile",
      entityIds: ["brasil", "chile"] as [string, string],
      distinctSuccessDays: [],
      updatedAt: "2026-07-25T12:00:00.000Z"
    };
    const ok = { ...validExport(), pairStates: [pair] };
    expect(parseExportJson(JSON.stringify(ok)).pairStates).toHaveLength(1);

    const inverted = {
      ...validExport(),
      pairStates: [
        { ...pair, id: "chile|brasil", entityIds: ["chile", "brasil"] }
      ]
    };
    expect(() => parseExportJson(JSON.stringify(inverted))).toThrow(
      /forma canônica/
    );
  });

  it.each([
    [
      "chave certa com entidades invertidas",
      "brasil|chile",
      ["chile", "brasil"]
    ],
    ["chave que não é das entidades", "brasil|xyz", ["brasil", "chile"]]
  ])("recusa par com %s", (_caso, id, entityIds) => {
    const data = {
      ...validExport(),
      pairStates: [
        {
          id,
          entityIds: entityIds as [string, string],
          distinctSuccessDays: [],
          updatedAt: "2026-07-25T12:00:00.000Z"
        }
      ]
    };
    expect(() => parseExportJson(JSON.stringify(data))).toThrow(
      /forma canônica/
    );
  });

  it("recusa XP que a regra não daria", () => {
    const data = exportWithAttempt("flagToNameInput");
    const inflated = {
      ...data,
      attempts: [{ ...data.attempts[0]!, outcome: "incorrect" }]
    };
    expect(() => parseExportJson(JSON.stringify(inflated))).toThrow(
      /regra não pontua/
    );
  });

  it("recusa preferências sem continente ativo", () => {
    const data = validExport();
    const settings: Record<string, unknown> = { ...data.settings };
    delete settings.activeContinent;
    expect(() =>
      parseExportJson(JSON.stringify({ ...data, settings }))
    ).toThrow();
  });

  it.each([1, 2])(
    "recusa backup de antes do piloto (formato %i) dizendo por quê",
    (schemaVersion) => {
      const data = { ...validExport(), schemaVersion };
      expect(() => parseExportJson(JSON.stringify(data))).toThrow(
        IncompatibleBackupError
      );
      expect(() => parseExportJson(JSON.stringify(data))).toThrow(
        /versão anterior do Brunanki/
      );
    }
  );

  it("recusa tentativa sem modalidade ou XP", () => {
    const data = exportWithAttempt("flagToNameInput");
    const withoutMode: Record<string, unknown> = { ...data.attempts[0]! };
    delete withoutMode.mode;
    expect(() =>
      parseExportJson(JSON.stringify({ ...data, attempts: [withoutMode] }))
    ).toThrow();
  });

  it("rejeita backup emitido sob o nome anterior do produto", () => {
    // A renomeação quebrou a compatibilidade de propósito (ADR-0001): o nome
    // vive no formato, e não há caminho de leitura para o formato antigo.
    const data = { ...validExport(), format: "ptanki-export" };
    expect(() => parseExportJson(JSON.stringify(data))).toThrow();
  });

  it("rejeita backup de versão de esquema desconhecida", () => {
    // Versão futura não é "anterior": falha pela validação, e não pela
    // mensagem de incompatibilidade, que falaria de progresso antigo.
    const data = { ...validExport(), schemaVersion: 99 };
    expect(() => parseExportJson(JSON.stringify(data))).toThrow();
    expect(() => parseExportJson(JSON.stringify(data))).not.toThrow(
      IncompatibleBackupError
    );
  });

  it("rejeita exercício que nenhum código jamais gerou", () => {
    // confusablePair e fluency estavam no contrato mas nunca foram
    // produzidos; um backup que os contenha está corrompido.
    expect(() =>
      parseExportJson(JSON.stringify(exportWithAttempt("fluency")))
    ).toThrow();
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
    pairStates: emptyTable,
    appSettings: singleton
  } as unknown as BrunankiDatabase;
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

  it("lista as entidades desconhecidas, inclusive as que só aparecem em par", async () => {
    const data = {
      ...validExport(),
      pairStates: [
        {
          id: "brasil|lemuria",
          entityIds: ["brasil", "lemuria"] as [string, string],
          distinctSuccessDays: [],
          updatedAt: "2026-07-25T12:00:00.000Z"
        }
      ]
    };

    await expect(
      prepareImport(emptyDatabase(), JSON.stringify(data), target)
    ).rejects.toThrow(/lemuria/);
  });
});
