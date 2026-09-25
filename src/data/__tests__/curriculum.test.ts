import { describe, expect, it } from "vitest";

import { pairStateId } from "@/domain/pairs";
import { CONTINENT_IDS } from "@/types/geography";

import { nextActivity } from "@/domain/next-activity";

import {
  CURRICULUM,
  introductionOrder,
  isContinentAvailable,
  undecidedConfusablePairs
} from "../curriculum";
import runtimeJson from "../runtime-catalog.json";
import type { RuntimeCatalog } from "@/types/runtime-catalog";

const entities = (runtimeJson as RuntimeCatalog).entities;

const continentOf = new Map(
  runtimeJson.entities.map(({ id, continent }) => [id, continent])
);

describe.each(
  CONTINENT_IDS.filter((id) => CURRICULUM[id] !== undefined).map((id) => [
    id,
    CURRICULUM[id]!
  ])
)("currículo de %s", (continent, curriculum) => {
  it("ordena exatamente as entidades do continente, cada uma uma vez", () => {
    // Permutação: uma entidade fora da ordem nunca seria introduzida, e uma
    // repetida seria introduzida duas vezes.
    const expected = runtimeJson.entities
      .filter((entity) => entity.continent === continent)
      .map(({ id }) => id)
      .sort();
    expect([...curriculum.order].sort()).toEqual(expected);
  });

  it("dá a cada par duas entidades do continente, razão e os dois traços", () => {
    const keys = new Set<string>();
    for (const pair of curriculum.pairs) {
      const [first, second] = pair.entityIds;
      expect(continentOf.get(first)).toBe(continent);
      expect(continentOf.get(second)).toBe(continent);
      const key = pairStateId(first, second);
      expect(keys.has(key)).toBe(false);
      keys.add(key);
      expect(pair.reason.trim()).not.toBe("");
      expect(Object.keys(pair.traits).sort()).toEqual([first, second].sort());
      for (const trait of Object.values(pair.traits)) {
        expect(trait.trim()).not.toBe("");
      }
    }
  });
});

describe("pares confundíveis sem decisão", () => {
  it("não sobra par acima do corte sem curadoria nem exceção", () => {
    expect(undecidedConfusablePairs("americas", entities)).toEqual([]);
  });

  it("aponta um par curado que for retirado", () => {
    // A lista só é útil se acusa: sem o par Haiti e República Dominicana,
    // ele reaparece como indeciso.
    const americas = CURRICULUM.americas!;
    const semHaiti = {
      ...americas,
      pairs: americas.pairs.filter(
        ({ entityIds }) => !entityIds.includes("hti")
      )
    };
    const original = CURRICULUM.americas;
    (CURRICULUM as Record<string, unknown>).americas = semHaiti;
    try {
      expect(undecidedConfusablePairs("americas", entities)).toContain(
        "dom|hti"
      );
    } finally {
      (CURRICULUM as Record<string, unknown>).americas = original;
    }
  });
});

describe("fila de um perfil zerado", () => {
  it("começa pela primeira bandeira da ordem sugerida", () => {
    expect(
      nextActivity({ states: [], entityOrder: introductionOrder("americas") })
    ).toEqual({ entityId: "usa", skill: "flagToNameRecall", reason: "new" });
  });
});

describe("introductionOrder", () => {
  it("põe a bandeira puxada do álbum na frente e mantém o resto", () => {
    const suggested = introductionOrder("americas");
    const pulled = introductionOrder("americas", "dma");
    expect(pulled[0]).toBe("dma");
    expect(pulled.slice(1)).toEqual(suggested.filter((id) => id !== "dma"));
  });

  it("ignora bandeira que não é do continente", () => {
    expect(introductionOrder("americas", "fra")).toEqual(
      introductionOrder("americas")
    );
  });
});

describe.each(
  CONTINENT_IDS.filter((id) => CURRICULUM[id] !== undefined).map((id) => [
    id,
    CURRICULUM[id]!
  ])
)("exceções de %s", (continent, curriculum) => {
  it("são do continente, justificadas e não repetem par curado", () => {
    const curated = new Set(
      curriculum.pairs.map(({ entityIds: [a, b] }) => pairStateId(a, b))
    );
    const seen = new Set<string>();
    for (const exception of curriculum.notConfusable) {
      const [first, second] = exception.entityIds;
      const key = pairStateId(first, second);
      expect(continentOf.get(first)).toBe(continent);
      expect(continentOf.get(second)).toBe(continent);
      expect(curated.has(key)).toBe(false);
      expect(seen.has(key)).toBe(false);
      seen.add(key);
      expect(exception.justification.trim()).not.toBe("");
    }
  });
});

describe("disponibilidade", () => {
  it("só libera continente com currículo", () => {
    expect(isContinentAvailable("americas")).toBe(true);
    for (const id of ["africa", "asia", "europe", "oceania"] as const) {
      expect(isContinentAvailable(id)).toBe(false);
      expect(introductionOrder(id)).toEqual([]);
    }
  });
});
