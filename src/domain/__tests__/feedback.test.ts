import { describe, expect, it } from "vitest";

import { CURRICULUM } from "@/data/curriculum";
import runtimeJson from "@/data/runtime-catalog.json";
import type { CuratedPair } from "@/types/curriculum";
import type { RuntimeCatalog } from "@/types/runtime-catalog";

import {
  distinctiveTrait,
  mistakeExplanation,
  verdictExplanation
} from "../feedback";

const byId = new Map(
  (runtimeJson as RuntimeCatalog).entities.map((entity) => [entity.id, entity])
);
const entity = (id: string) => byId.get(id)!;

/** Um par de fora das Américas, para o contrato não depender do piloto. */
const chadRomania: CuratedPair = {
  entityIds: ["rou", "tcd"],
  reason: "Azul, amarelo e vermelho em três faixas verticais iguais.",
  traits: {
    tcd: "o Chade tem o azul mais escuro",
    rou: "a Romênia tem o azul mais claro"
  }
};

describe("mistakeExplanation", () => {
  it("com par curado, diz o traço da certa e depois o da escolhida", () => {
    // Marcou Romênia vendo o Chade: é o Chade que precisa ser reconhecido.
    expect(
      mistakeExplanation(entity("rou"), entity("tcd"), [chadRomania])
    ).toBe("O Chade tem o azul mais escuro; a Romênia tem o azul mais claro.");
  });

  it("usa o par do currículo das Américas nas duas direções", () => {
    const pairs = CURRICULUM.americas!.pairs;
    expect(mistakeExplanation(entity("col"), entity("ecu"), pairs)).toBe(
      "O Equador tem o brasão, com o condor, no centro; a Colômbia não tem brasão."
    );
    expect(mistakeExplanation(entity("ecu"), entity("col"), pairs)).toBe(
      "A Colômbia não tem brasão; o Equador tem o brasão, com o condor, no centro."
    );
  });

  it("sem curadoria e na mesma sub-região, nomeia as duas sem inventar distinção", () => {
    const text = mistakeExplanation(entity("bra"), entity("sur"), []);
    expect(text).toBe(
      "Suriname e Brasil são da mesma sub-região: América do Sul, Américas."
    );
  });

  it("sem curadoria e em lugares diferentes, diz onde fica cada uma", () => {
    expect(mistakeExplanation(entity("jpn"), entity("bra"), [])).toBe(
      "Brasil: América do Sul, Américas. Japão: Ásia Oriental, Ásia."
    );
  });

  it("nenhuma explicação fala de fila, revisão ou agendamento", () => {
    const pairs = CURRICULUM.americas!.pairs;
    const texts = [
      mistakeExplanation(entity("col"), entity("ecu"), pairs),
      mistakeExplanation(entity("bra"), entity("sur"), pairs),
      mistakeExplanation(entity("jpn"), entity("bra"), pairs)
    ];
    for (const text of texts) {
      expect(text).not.toMatch(/fila|revis|reaparec|FSRS|agend|intervalo/i);
    }
  });
});

describe("distinctiveTrait", () => {
  it("reforça o acerto com o traço da bandeira no par", () => {
    expect(distinctiveTrait(entity("hnd"), CURRICULUM.americas!.pairs)).toBe(
      "Honduras tem cinco estrelas azuis no centro."
    );
  });

  it("não diz nada de bandeira sem par curado", () => {
    expect(
      distinctiveTrait(entity("bra"), CURRICULUM.americas!.pairs)
    ).toBeUndefined();
  });
});

describe("verdictExplanation", () => {
  const pairs = CURRICULUM.americas!.pairs;

  it("erro com outra bandeira identificada ganha a distinção", () => {
    expect(
      verdictExplanation("incorrect", entity("ecu"), entity("col"), pairs)
    ).toBe(mistakeExplanation(entity("col"), entity("ecu"), pairs));
  });

  it("erro sem bandeira identificada ganha o traço da certa", () => {
    expect(
      verdictExplanation("incorrect", entity("hnd"), undefined, pairs)
    ).toBe("Honduras tem cinco estrelas azuis no centro.");
  });

  it("parcial diz que o reconhecimento veio, e não fala de agenda", () => {
    expect(verdictExplanation("partial", entity("hnd"), undefined, pairs)).toBe(
      "Você reconheceu a bandeira; só a grafia saiu diferente."
    );
  });

  it("acerto reforça o traço, e fica sem texto quando não há par", () => {
    expect(
      verdictExplanation("correct", entity("ecu"), undefined, pairs)
    ).toMatch(/brasão/);
    expect(
      verdictExplanation("correct", entity("bra"), undefined, pairs)
    ).toBeUndefined();
  });
});
