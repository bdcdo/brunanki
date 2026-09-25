import { confusability, type DistractorCandidate } from "@/domain/distractors";
import { pairStateId } from "@/domain/pairs";
import type { ContinentId } from "@/types/geography";

/**
 * Um par de bandeiras que se confundem, com o traço que separa cada uma.
 *
 * O traço é escrito do ponto de vista da bandeira que ele descreve, porque é
 * o que o feedback de erro diz: quem marcou Colômbia vendo o Equador precisa
 * ouvir o que o Equador tem, e o que a Colômbia não tem.
 */
export interface CuratedPair {
  readonly entityIds: readonly [string, string];
  /** Por que as duas se confundem, numa frase. */
  readonly reason: string;
  /** O que identifica cada uma diante da outra, indexado pelo ID. */
  readonly traits: Readonly<Record<string, string>>;
}

/**
 * O currículo editorial de um continente: a ordem sugerida de introdução e os
 * pares confundíveis. Escrito à mão, e não derivado do catálogo, porque a
 * confundibilidade calculada pela paleta não enxerga disposição nem emblema:
 * ela não distingue Nicarágua de El Salvador, que diferem no brasão e no tom.
 *
 * A ordem vai por sub-região, da mais fácil à mais difícil, e dentro de cada
 * uma põe as bandeiras de desenho único antes das que têm par. É sugestão: a
 * pessoa pode puxar qualquer bandeira para a frente pelo álbum.
 */
export interface ContinentCurriculum {
  readonly order: readonly string[];
  readonly pairs: readonly CuratedPair[];
  /**
   * Pares que a heurística de paleta considera confundíveis e que a curadoria
   * decidiu não tratar como par, com a justificativa. Ficam escritos para que
   * a decisão seja revisável, e para que um par novo acima do corte não passe
   * sem que alguém decida sobre ele.
   */
  readonly notConfusable: readonly {
    readonly entityIds: readonly [string, string];
    readonly justification: string;
  }[];
}

/**
 * O corte da heurística a partir do qual um par precisa de decisão editorial:
 * ou vira par curado, ou entra em `notConfusable` com justificativa.
 *
 * Medido nas Américas em 24/09/2026: abaixo de 0,84 ficam os pares que só
 * dividem cores soltas, como Chile e Venezuela; a partir dele, os que dividem
 * paleta e sub-região, que é onde a confusão real acontece.
 */
export const CONFUSABILITY_REVIEW_THRESHOLD = 0.84;

export const CURRICULUM: Readonly<
  Partial<Record<ContinentId, ContinentCurriculum>>
> = {
  americas: {
    order: [
      // América Setentrional
      "usa",
      "can",
      // América do Sul
      "bra",
      "arg",
      "chl",
      "per",
      "col",
      "ecu",
      "ven",
      "ury",
      "bol",
      "pry",
      "guy",
      "sur",
      // América Central
      "mex",
      "pan",
      "cri",
      "gtm",
      "blz",
      "hnd",
      "nic",
      "slv",
      // Caribe
      "cub",
      "jam",
      "dom",
      "hti",
      "bhs",
      "tto",
      "kna",
      "brb",
      "atg",
      "lca",
      "vct",
      "grd",
      "dma"
    ],
    pairs: [
      {
        entityIds: ["col", "ecu"],
        reason:
          "Amarelo, azul e vermelho em faixas horizontais, com o amarelo ocupando a metade de cima.",
        traits: {
          col: "a Colômbia não tem brasão",
          ecu: "o Equador tem o brasão, com o condor, no centro"
        }
      },
      {
        entityIds: ["col", "ven"],
        reason: "Amarelo, azul e vermelho em faixas horizontais, nessa ordem.",
        traits: {
          col: "a Colômbia tem o amarelo com o dobro da altura das outras faixas e nenhuma estrela",
          ven: "a Venezuela tem as três faixas iguais e um arco de oito estrelas brancas no azul"
        }
      },
      {
        entityIds: ["ecu", "ven"],
        reason: "Amarelo, azul e vermelho em faixas horizontais, nessa ordem.",
        traits: {
          ecu: "o Equador tem o amarelo mais alto e o brasão no centro",
          ven: "a Venezuela tem as três faixas iguais e um arco de oito estrelas brancas, sem brasão"
        }
      },
      {
        entityIds: ["hnd", "nic"],
        reason:
          "Azul, branco e azul em faixas horizontais, com um emblema no centro.",
        traits: {
          hnd: "Honduras tem cinco estrelas azuis no centro",
          nic: "a Nicarágua tem um brasão triangular dentro de um anel de texto"
        }
      },
      {
        entityIds: ["hnd", "slv"],
        reason:
          "Azul, branco e azul em faixas horizontais, com um emblema no centro.",
        traits: {
          hnd: "Honduras tem cinco estrelas azuis no centro",
          slv: "El Salvador tem um brasão redondo, com coroa de louros, no centro"
        }
      },
      {
        entityIds: ["nic", "slv"],
        reason:
          "Azul, branco e azul em faixas horizontais, com um brasão no centro.",
        traits: {
          nic: "a Nicarágua tem o azul mais claro e o brasão é um triângulo dentro de um anel de texto",
          slv: "El Salvador tem o azul mais escuro e o brasão é redondo, com coroa de louros"
        }
      },
      {
        entityIds: ["arg", "ury"],
        reason: "Azul-claro e branco, com o sol de maio.",
        traits: {
          arg: "a Argentina tem três faixas e o sol no centro",
          ury: "o Uruguai tem nove listras e o sol no canto superior esquerdo"
        }
      },
      {
        entityIds: ["dom", "pan"],
        reason: "Azul, branco e vermelho divididos em quatro quadrantes.",
        traits: {
          dom: "a República Dominicana tem uma cruz branca e o brasão no centro",
          pan: "o Panamá tem quadrantes brancos com uma estrela azul e outra vermelha, sem cruz"
        }
      },
      {
        entityIds: ["chl", "cub"],
        reason: "Vermelho, branco e azul com uma estrela branca solitária.",
        traits: {
          chl: "o Chile tem a estrela num quadrado azul no canto, sobre duas faixas",
          cub: "Cuba tem a estrela num triângulo vermelho, sobre cinco listras"
        }
      },
      {
        entityIds: ["kna", "tto"],
        reason:
          "Uma faixa preta na diagonal, com bordas claras, de um canto ao outro.",
        traits: {
          kna: "São Cristóvão e Nevis tem duas estrelas brancas na faixa e cantos verde e vermelho",
          tto: "Trinidade e Tobago tem o fundo todo vermelho e nenhuma estrela"
        }
      },
      {
        entityIds: ["dom", "hti"],
        reason:
          "Azul, vermelho e branco com o brasão no centro, e as duas dividem a mesma ilha.",
        traits: {
          dom: "a República Dominicana tem uma cruz branca que divide quatro quadrantes",
          hti: "o Haiti tem só duas faixas horizontais, azul sobre vermelho, com o brasão num retângulo branco"
        }
      },
      {
        entityIds: ["gtm", "slv"],
        reason: "Azul, branco e azul, com um brasão no centro da faixa branca.",
        traits: {
          gtm: "a Guatemala tem as faixas na vertical, em azul-celeste",
          slv: "El Salvador tem as faixas na horizontal"
        }
      },
      {
        entityIds: ["gtm", "nic"],
        reason: "Azul, branco e azul, com um brasão no centro da faixa branca.",
        traits: {
          gtm: "a Guatemala tem as faixas na vertical",
          nic: "a Nicarágua tem as faixas na horizontal"
        }
      },
      {
        entityIds: ["can", "per"],
        reason: "Vermelho, branco e vermelho em faixas verticais.",
        traits: {
          can: "o Canadá tem a faixa branca mais larga, com a folha de bordo",
          per: "o Peru tem as três faixas iguais e nada no centro"
        }
      }
    ],
    notConfusable: [
      {
        entityIds: ["cri", "pan"],
        justification:
          "Mesmas cores, disposição sem nada em comum: faixas horizontais na Costa Rica, quadrantes com estrelas no Panamá."
      },
      {
        entityIds: ["dom", "kna"],
        justification:
          "Cores parecidas, desenho oposto: cruz com brasão contra faixa diagonal com estrelas."
      },
      {
        entityIds: ["gtm", "mex"],
        justification:
          "Os dois têm três faixas verticais com brasão, mas o México é verde e vermelho, e a Guatemala, azul-celeste."
      },
      {
        entityIds: ["blz", "mex"],
        justification:
          "Belize tem fundo azul-escuro inteiro com listras vermelhas; o México tem três faixas verdes, brancas e vermelhas."
      },
      {
        entityIds: ["blz", "gtm"],
        justification:
          "Belize tem fundo azul-escuro inteiro com o brasão num disco branco; a Guatemala tem faixas verticais azul-celeste e branca."
      },
      {
        entityIds: ["mex", "slv"],
        justification:
          "O México é verde, branco e vermelho em faixas verticais; El Salvador é azul e branco em faixas horizontais."
      },
      {
        entityIds: ["blz", "slv"],
        justification:
          "Belize tem fundo azul-escuro inteiro com listras vermelhas; El Salvador tem três faixas horizontais, sem vermelho."
      }
    ]
  }
};

/**
 * Os continentes que podem ser estudados: os que têm currículo. Liberar um
 * continente é escrever o currículo dele, e não virar uma chave.
 */
export function isContinentAvailable(continent: ContinentId): boolean {
  return CURRICULUM[continent] !== undefined;
}

/**
 * A ordem sugerida de novidades, ou nenhuma, para continente sem currículo.
 *
 * `priority` é a bandeira que a pessoa puxou do álbum para estudar agora: ela
 * vai para a frente, e o resto segue a sugestão. Bandeira fora do continente
 * é ignorada, porque novidade só entra pelo continente ativo.
 */
export function introductionOrder(
  continent: ContinentId,
  priority?: string
): readonly string[] {
  const order = CURRICULUM[continent]?.order ?? [];
  if (priority === undefined || !order.includes(priority)) return order;
  return [priority, ...order.filter((id) => id !== priority)];
}

/**
 * Os pares do continente que a heurística considera confundíveis e sobre os
 * quais a curadoria ainda não decidiu: nem par curado, nem exceção
 * justificada. O validador falha se a lista não estiver vazia, e é isso que
 * impede um refresh de paletas de criar uma confusão que ninguém olhou.
 */
export function undecidedConfusablePairs(
  continent: ContinentId,
  entities: readonly DistractorCandidate[]
): string[] {
  const curriculum = CURRICULUM[continent];
  if (!curriculum) return [];
  const decided = new Set(
    [...curriculum.pairs, ...curriculum.notConfusable].map(
      ({ entityIds: [first, second] }) => pairStateId(first, second)
    )
  );
  const members = entities.filter((entity) => entity.continent === continent);
  const undecided: string[] = [];
  for (const [index, left] of members.entries()) {
    for (const right of members.slice(index + 1)) {
      const key = pairStateId(left.id, right.id);
      if (
        !decided.has(key) &&
        confusability(left, right) >= CONFUSABILITY_REVIEW_THRESHOLD
      ) {
        undecided.push(key);
      }
    }
  }
  return undecided.sort();
}
