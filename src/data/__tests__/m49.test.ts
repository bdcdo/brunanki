import { describe, expect, it } from "vitest";

import { geographyFor, indexM49, type M49Area } from "../m49";

function area(overrides: Partial<M49Area>): M49Area {
  return {
    m49: "484",
    iso3: "MEX",
    name: "Mexico",
    regionCode: "019",
    regionName: "Americas",
    subRegionCode: "419",
    subRegionName: "Latin America and the Caribbean",
    intermediateRegionCode: "013",
    intermediateRegionName: "Central America",
    ...overrides
  };
}

function snapshot(...areas: M49Area[]) {
  return {
    source: "teste",
    url: "https://example.org",
    retrievedAt: "2026-09-24",
    areas
  };
}

describe("geographyFor", () => {
  it("usa a região intermediária quando a M49 tem uma", () => {
    // É o que tira o México da "América Latina e Caribe" genérica e o põe na
    // América Central, e o que parte as Américas em quatro blocos.
    const index = indexM49(snapshot(area({})));
    expect(geographyFor("mex", "484", index)).toEqual({
      continent: "americas",
      subregion: "central-america"
    });
  });

  it("cai na sub-região quando não há região intermediária", () => {
    const index = indexM49(
      snapshot(
        area({
          m49: "196",
          iso3: "CYP",
          regionCode: "142",
          subRegionCode: "145",
          intermediateRegionCode: ""
        })
      )
    );
    expect(geographyFor("cyp", "196", index)).toEqual({
      continent: "asia",
      subregion: "western-asia"
    });
  });

  it("recusa entidade sem código M49", () => {
    const index = indexM49(snapshot(area({})));
    expect(() => geographyFor("xkx", undefined, index)).toThrow(
      /sem código M49: xkx/
    );
  });

  it("recusa código ausente do snapshot, sem completar zeros", () => {
    // "76" não é "076": o catálogo guarda três dígitos, e uma divergência de
    // formato tem de aparecer em vez de ser corrigida em silêncio.
    const index = indexM49(snapshot(area({ m49: "076", iso3: "BRA" })));
    expect(() => geographyFor("bra", "76", index)).toThrow(
      /ausente do snapshot: 76/
    );
  });

  it("recusa região sem continente e sub-região sem ID", () => {
    const semContinente = indexM49(snapshot(area({ regionCode: "999" })));
    expect(() => geographyFor("mex", "484", semContinente)).toThrow(
      /sem continente: 999/
    );
    const semSubregiao = indexM49(
      snapshot(area({ intermediateRegionCode: "998" }))
    );
    expect(() => geographyFor("mex", "484", semSubregiao)).toThrow(
      /sem ID: 998/
    );
  });

  it("recusa sub-região que as tabelas põem em outro continente", () => {
    // Região das Américas com sub-região da Europa: cada tabela de tradução
    // está certa sozinha, e só a conferência cruzada vê a contradição.
    const index = indexM49(snapshot(area({ intermediateRegionCode: "155" })));
    expect(() => geographyFor("mex", "484", index)).toThrow(
      /fora do continente americas/
    );
  });
});

describe("indexM49", () => {
  it("recusa código repetido no snapshot", () => {
    expect(() => indexM49(snapshot(area({}), area({ iso3: "XXX" })))).toThrow(
      /repetido no snapshot: 484/
    );
  });
});
