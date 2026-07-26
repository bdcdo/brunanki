import { describe, expect, it } from "vitest";

import type { LearningEntity } from "@/types/catalog";

import {
  CountryNameResolver,
  damerauLevenshteinDistance,
  normalizeCountryName
} from "../name-resolution";

function entity(
  id: string,
  displayNamePtBr: string,
  aliasesPtBr: string[] = []
): LearningEntity {
  return {
    id,
    displayNamePtBr,
    aliasesPtBr,
    sourceNames: {},
    identifiers: { wikidataQid: "Q1" },
    // Irrelevante para a resolução de nomes, mas já não é livre: `Region` é um
    // conjunto fechado, e era com um `"Test"` solto aqui que se via que o
    // campo aceitava qualquer coisa.
    region: "Américas",
    memberships: [],
    primaryFlagRevisionId: `flag-${id}`
  };
}

describe("normalizeCountryName", () => {
  it("normaliza caixa, diacríticos, pontuação e espaços", () => {
    expect(normalizeCountryName("  São-Tomé   e PRÍNCIPE! ")).toBe(
      "sao tome e principe"
    );
  });
});

describe("damerauLevenshteinDistance", () => {
  it("conta transposição adjacente como uma edição", () => {
    expect(damerauLevenshteinDistance("brasil", "barsil")).toBe(1);
  });
});

describe("CountryNameResolver", () => {
  const resolver = new CountryNameResolver([
    entity("brasil", "Brasil"),
    entity("chade", "Chade"),
    entity("chile", "Chile"),
    entity("china", "China"),
    entity("coreia-sul", "Coreia do Sul", ["Coreia do Sul"]),
    entity("coreia-norte", "Coreia do Norte"),
    entity("vaticano", "Vaticano", ["Santa Sé"])
  ]);

  it("aceita nome e alias exatos após normalização", () => {
    expect(resolver.classify("BRÁSIL", "brasil")).toEqual({
      kind: "exact",
      entityId: "brasil"
    });
    expect(resolver.classify("Santa Se", "vaticano")).toEqual({
      kind: "exact",
      entityId: "vaticano"
    });
  });

  it("classifica typo apenas quando o alvo é o vizinho único permitido", () => {
    expect(resolver.classify("Barsil", "brasil")).toEqual({
      kind: "partial",
      entityId: "brasil",
      distance: 1
    });
  });

  it("não tolera typo em nomes com até quatro caracteres", () => {
    const shortResolver = new CountryNameResolver([
      entity("laos", "Laos"),
      entity("mali", "Mali")
    ]);
    expect(shortResolver.classify("Laod", "laos")).toEqual({
      kind: "incorrect"
    });
  });

  it("trata o nome exato de outra entidade como erro, nunca typo", () => {
    expect(resolver.classify("Coreia do Norte", "coreia-sul")).toEqual({
      kind: "incorrect",
      matchedEntityId: "coreia-norte"
    });
  });

  it("não aceita como typo uma entrada empatada entre entidades", () => {
    expect(resolver.classify("Chila", "china")).toEqual({
      kind: "incorrect"
    });
  });

  it("rejeita aliases normalizados ambíguos na construção", () => {
    expect(
      () =>
        new CountryNameResolver([
          entity("congo-1", "Congo A", ["Congo"]),
          entity("congo-2", "Congo B", ["Côngo"])
        ])
    ).toThrow(/colide/);
  });
});

describe("índice de nomes", () => {
  it("devolve sempre a mesma instância", async () => {
    // O índice cobre os nomes e apelidos de todas as entidades e era construído
    // duas vezes, no escopo de módulo de cada tela de sessão.
    const { getNameResolver } = await import("@/data/name-index");
    expect(getNameResolver()).toBe(getNameResolver());
  });
});
