import { describe, expect, it } from "vitest";

import {
  describePalette,
  paletteSimilarity,
  quantizeHex,
  sortPalette
} from "../palette";

describe("quantizeHex", () => {
  it("reduz tons próximos ao mesmo nome", () => {
    // Os vermelhos da Romênia e do Chade diferem no hex e são o mesmo
    // vermelho aos olhos de quem estuda.
    expect(quantizeHex("#ce1126")).toBe("vermelho");
    expect(quantizeHex("#c60c30")).toBe("vermelho");
    expect(quantizeHex("#fcd116")).toBe("amarelo");
    expect(quantizeHex("#fecb00")).toBe("amarelo");
  });

  it("aceita as formas de cor usadas nos SVGs", () => {
    expect(quantizeHex("#fff")).toBe("branco");
    expect(quantizeHex("#FFFFFF")).toBe("branco");
    expect(quantizeHex("red")).toBe("vermelho");
    expect(quantizeHex("  #009A44 ")).toBe("verde");
  });

  it("classifica acromáticos pela luminosidade, não pelo matiz", () => {
    // Um vermelho quase preto deve ser lido como preto.
    expect(quantizeHex("#0a0203")).toBe("preto");
    expect(quantizeHex("#808080")).toBe("cinza");
    expect(quantizeHex("#000")).toBe("preto");
  });

  it("devolve indefinido para valores que não são cor", () => {
    expect(quantizeHex("none")).toBeUndefined();
    expect(quantizeHex("url(#grad)")).toBeUndefined();
    expect(quantizeHex("")).toBeUndefined();
  });
});

describe("describePalette", () => {
  it("usa vírgulas e 'e' antes do último", () => {
    expect(describePalette(["verde", "branco", "laranja"])).toBe(
      "verde, branco e laranja"
    );
    expect(describePalette(["vermelho", "branco"])).toBe("vermelho e branco");
    expect(describePalette(["azul"])).toBe("azul");
  });
});

describe("paletteSimilarity", () => {
  it("dá 1 a bandeiras com exatamente as mesmas cores", () => {
    // Irlanda e Costa do Marfim: a mesma bandeira em ordem invertida.
    expect(
      paletteSimilarity(
        ["verde", "branco", "laranja"],
        ["verde", "branco", "laranja"]
      )
    ).toBe(1);
  });

  it("dá 0 a paletas disjuntas", () => {
    expect(paletteSimilarity(["verde"], ["vermelho"])).toBe(0);
  });

  it("cresce com a sobreposição", () => {
    const parcial = paletteSimilarity(
      ["verde", "branco", "laranja"],
      ["verde", "branco", "vermelho"]
    );
    expect(parcial).toBeGreaterThan(0);
    expect(parcial).toBeLessThan(1);
  });
});

describe("sortPalette", () => {
  it("remove repetições e ordena pela lista canônica", () => {
    expect(sortPalette(["branco", "vermelho", "branco", "amarelo"])).toEqual([
      "vermelho",
      "amarelo",
      "branco"
    ]);
  });
});
