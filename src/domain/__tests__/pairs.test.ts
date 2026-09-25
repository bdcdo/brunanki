import { describe, expect, it } from "vitest";

import { pairEntityIds, pairStateId } from "../pairs";

describe("pairStateId", () => {
  it("dá a mesma chave nas duas ordens", () => {
    expect(pairStateId("tcd", "rou")).toBe("rou|tcd");
    expect(pairStateId("rou", "tcd")).toBe("rou|tcd");
  });

  it("recusa par de uma entidade consigo mesma", () => {
    expect(() => pairStateId("tcd", "tcd")).toThrow(/distintas: tcd/);
  });

  it("devolve os IDs na ordem da chave", () => {
    expect(pairEntityIds("tcd", "rou")).toEqual(["rou", "tcd"]);
  });
});
