import { confusability, type DistractorCandidate } from "@/domain/distractors";
import { pairStateId } from "@/domain/pairs";
import { entityById } from "@/data/runtime-catalog";
import type { CuratedPair } from "@/types/curriculum";
import type { ContinentId, SubregionId } from "@/types/geography";

export type { CuratedPair };

/**
 * O currículo editorial de um continente: a ordem sugerida de introdução e os
 * pares confundíveis. Escrito à mão, e não derivado do catálogo, porque a
 * confundibilidade calculada pela paleta não enxerga disposição nem emblema:
 * ela não distingue Nicarágua de El Salvador, que diferem nos detalhes do
 * brasão e no tom do azul.
 *
 * A ordem vai por sub-região, da mais fácil à mais difícil. Dentro de cada
 * uma, as bandeiras mais conhecidas vêm primeiro, e os membros de um par
 * entram próximos, para que a diferença entre eles apareça cedo, e não meses
 * depois. É sugestão: a pessoa pode puxar qualquer bandeira pelo álbum.
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
 * Medido nas Américas em 24/09/2026. O corte fica logo acima do patamar de
 * 0,825, onde a heurística acumula pares da mesma sub-região que só dividem
 * parte da paleta. Ele não é a fronteira da confusão real: pares que se
 * confundem pelo desenho, como Honduras e Nicarágua, ficam bem abaixo dele, e
 * é por isso que o currículo cura pares por conta própria, e não só os que a
 * heurística aponta. O corte serve para que a heurística não passe calada.
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
          nic: "a Nicarágua tem um brasão no centro"
        }
      },
      {
        entityIds: ["hnd", "slv"],
        reason:
          "Azul, branco e azul em faixas horizontais, com um emblema no centro.",
        traits: {
          hnd: "Honduras tem cinco estrelas azuis no centro",
          slv: "El Salvador tem um brasão, com coroa de louros, no centro"
        }
      },
      {
        entityIds: ["nic", "slv"],
        reason:
          "Azul, branco e azul em faixas horizontais, com um brasão no centro.",
        traits: {
          nic: "a Nicarágua tem o azul mais claro e, no brasão, só o triângulo dentro do anel de texto, sem louros",
          slv: "El Salvador tem o azul mais escuro e, no brasão, coroa de louros e bandeiras atrás do triângulo"
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
          kna: "São Cristóvão e Nevis tem duas estrelas brancas na faixa, que sobe da esquerda para a direita, e cantos verde e vermelho",
          tto: "Trinidade e Tobago tem o fundo todo vermelho, nenhuma estrela e a faixa descendo da esquerda para a direita"
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
          "Dividem só o vermelho e o branco, e o desenho é oposto: cruz com brasão contra faixa diagonal com estrelas."
      },
      {
        entityIds: ["gtm", "mex"],
        justification:
          "Os dois têm três faixas verticais com brasão, mas o México é verde e vermelho, e a Guatemala, azul-celeste."
      },
      {
        entityIds: ["blz", "mex"],
        justification:
          "Belize tem o campo azul-escuro, com uma listra vermelha em cima e outra embaixo; o México tem três faixas verticais, verde, branca e vermelha."
      },
      {
        entityIds: ["blz", "gtm"],
        justification:
          "Belize tem o campo azul-escuro, com listras vermelhas nas bordas e o brasão num disco branco; a Guatemala tem faixas verticais azul-celeste e branca."
      },
      {
        entityIds: ["mex", "slv"],
        justification:
          "O México é verde, branco e vermelho em faixas verticais; El Salvador é azul e branco em faixas horizontais."
      },
      {
        entityIds: ["blz", "slv"],
        justification:
          "Belize tem o campo azul-escuro, com listras vermelhas nas bordas; El Salvador tem três faixas horizontais, azul, branca e azul."
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

/** Uma página do álbum: uma sub-região, com as figurinhas numeradas. */
export interface AlbumPage {
  readonly subregion: SubregionId;
  readonly slots: readonly {
    readonly entityId: string;
    readonly number: number;
  }[];
}

/**
 * As páginas do álbum de um continente, uma por sub-região, na ordem do
 * currículo.
 *
 * O número de cada figurinha é a posição dela na ordem sugerida, e não a
 * ordem alfabética: é a mesma sequência em que as novidades chegam, então a
 * pessoa vê o álbum se preencher do começo para o fim. A ordem do currículo
 * já vem agrupada por sub-região, e a página muda quando a sub-região muda.
 */
export function albumPages(continent: ContinentId): AlbumPage[] {
  const pages: {
    subregion: SubregionId;
    slots: { entityId: string; number: number }[];
  }[] = [];
  for (const [index, entityId] of introductionOrder(continent).entries()) {
    const subregion = entityById.get(entityId)?.subregion;
    if (subregion === undefined) continue;
    const current = pages.at(-1);
    const slot = { entityId, number: index + 1 };
    if (current?.subregion === subregion) current.slots.push(slot);
    else pages.push({ subregion, slots: [slot] });
  }
  return pages;
}
