import { describe, expect, it } from "vitest";

import { normalizeCountryName } from "../text";

describe("normalizeCountryName", () => {
  it("remove acentos e caixa de nomes em pt-BR", () => {
    expect(normalizeCountryName("São Tomé e Príncipe")).toBe(
      "sao tome e principe"
    );
    expect(normalizeCountryName("MÔNACO")).toBe("monaco");
    expect(normalizeCountryName("Curaçao")).toBe("curacao");
  });

  it("trata pontuação como separador e colapsa espaços", () => {
    // As quatro versões antigas divergiam justamente aqui: algumas não
    // trocavam pontuação por espaço e outras não colapsavam repetições.
    expect(normalizeCountryName("Timor-Leste")).toBe("timor leste");
    expect(normalizeCountryName("Côte d'Ivoire")).toBe("cote d ivoire");
    expect(normalizeCountryName("  Guiné－Bissau  ")).toBe("guine bissau");
    expect(normalizeCountryName("Bósnia   e    Herzegovina")).toBe(
      "bosnia e herzegovina"
    );
  });

  it("é idempotente", () => {
    const once = normalizeCountryName("República Tcheca");
    expect(normalizeCountryName(once)).toBe(once);
  });

  it("iguala formas Unicode compostas e decompostas", () => {
    // "á" pode chegar como um único ponto de código ou como "a" + acento;
    // é a decomposição NFD antes da remoção das marcas que os iguala.
    expect(normalizeCountryName("Á")).toBe(normalizeCountryName("Á"));
  });
});
