import { describe, expect, it } from "vitest";

import { pairStateId } from "@/domain/pairs";
import { CONTINENT_IDS } from "@/types/geography";

import {
  CURRICULUM,
  introductionOrder,
  isContinentAvailable
} from "../curriculum";
import runtimeJson from "../runtime-catalog.json";

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

  it("dá a cada par duas entidades do catálogo, razão e os dois traços", () => {
    const keys = new Set<string>();
    for (const pair of curriculum.pairs) {
      const [first, second] = pair.entityIds;
      expect(continentOf.has(first)).toBe(true);
      expect(continentOf.has(second)).toBe(true);
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

describe("disponibilidade", () => {
  it("só libera continente com currículo", () => {
    expect(isContinentAvailable("americas")).toBe(true);
    for (const id of ["africa", "asia", "europe", "oceania"] as const) {
      expect(isContinentAvailable(id)).toBe(false);
      expect(introductionOrder(id)).toEqual([]);
    }
  });
});
