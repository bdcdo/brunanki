import { describe, expect, it } from "vitest";

import runtimeJson from "@/data/runtime-catalog.json";
import type { RuntimeCatalog } from "@/types/runtime-catalog";

import { buildChoiceRound, confusability } from "../distractors";
import { mulberry32 } from "../shuffle";

const entities = (runtimeJson as RuntimeCatalog).entities;
const byId = new Map(entities.map((entity) => [entity.id, entity]));
const target = byId.get("irl")!;

describe("confusability", () => {
  it("dá nota alta a pares que o aluno de fato confunde", () => {
    const irlandaCostaDoMarfim = confusability(target, byId.get("civ")!);
    const irlandaJapao = confusability(target, byId.get("jpn")!);
    expect(irlandaCostaDoMarfim).toBeGreaterThan(irlandaJapao);
    expect(irlandaCostaDoMarfim).toBeGreaterThan(0.6);
  });
});

describe("buildChoiceRound", () => {
  it("produz variedade em vez de sempre as mesmas alternativas", () => {
    // Antes, distractors() ordenava por id e cortava os três primeiros: para
    // um dado alvo, as alternativas erradas eram sempre exatamente as mesmas
    // três, e o aluno passava a reconhecer o conjunto em vez da bandeira.
    const vistos = new Set<string>();
    for (let rodada = 0; rodada < 200; rodada += 1) {
      const round = buildChoiceRound(
        target,
        entities,
        4,
        mulberry32(rodada + 1)
      );
      for (const choice of round) {
        if (choice.id !== target.id) vistos.add(choice.id);
      }
    }
    expect(vistos.size).toBeGreaterThan(15);
  });

  it("favorece bandeiras parecidas sem se fixar nelas", () => {
    let comCostaDoMarfim = 0;
    const rodadas = 300;
    for (let rodada = 0; rodada < rodadas; rodada += 1) {
      const round = buildChoiceRound(
        target,
        entities,
        4,
        mulberry32(rodada + 1)
      );
      if (round.some((choice) => choice.id === "civ")) comCostaDoMarfim += 1;
    }
    const uniforme = 3 / (entities.length - 1);
    // Bem acima do acaso — e ainda assim longe de aparecer em toda rodada,
    // que é o que o peso base garante.
    expect(comCostaDoMarfim / rodadas).toBeGreaterThan(uniforme * 5);
    expect(comCostaDoMarfim / rodadas).toBeLessThan(0.9);
  });

  it("inclui o alvo exatamente uma vez e completa as alternativas", () => {
    for (let rodada = 0; rodada < 50; rodada += 1) {
      const round = buildChoiceRound(
        target,
        entities,
        4,
        mulberry32(rodada + 1)
      );
      expect(round).toHaveLength(4);
      expect(round.filter((choice) => choice.id === target.id)).toHaveLength(1);
      expect(new Set(round.map((choice) => choice.id)).size).toBe(4);
    }
  });

  it("espalha a resposta certa por todas as posições", () => {
    // Com a ordenação estável de antes, a posição do alvo era previsível.
    const posicoes = new Set<number>();
    for (let rodada = 0; rodada < 100; rodada += 1) {
      const round = buildChoiceRound(
        target,
        entities,
        4,
        mulberry32(rodada + 1)
      );
      posicoes.add(round.findIndex((choice) => choice.id === target.id));
    }
    expect(posicoes).toEqual(new Set([0, 1, 2, 3]));
  });

  it("é reprodutível com a mesma semente", () => {
    const primeira = buildChoiceRound(target, entities, 4, mulberry32(42));
    const segunda = buildChoiceRound(target, entities, 4, mulberry32(42));
    expect(primeira.map((c) => c.id)).toEqual(segunda.map((c) => c.id));
  });

  it("recusa montar uma rodada sem candidatos suficientes", () => {
    expect(() =>
      buildChoiceRound(target, [target, byId.get("civ")!], 4, mulberry32(1))
    ).toThrow(/insuficientes/);
  });
});
