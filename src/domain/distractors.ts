import type { ContinentId, SubregionId } from "@/types/geography";

import type { ColorNamePtBr } from "./palette";
import { paletteSimilarity } from "./palette";
import { shuffle, weightedSample, type RandomSource } from "./shuffle";

export interface DistractorCandidate {
  readonly id: string;
  readonly continent: ContinentId;
  readonly subregion: SubregionId;
  readonly palette: readonly ColorNamePtBr[];
}

/**
 * Quantos candidatos entram no sorteio, dos mais parecidos para os menos.
 *
 * Sem esse recorte o viés se dilui: com todas as outras bandeiras do catálogo
 * no sorteio, mesmo a mais parecida ficava com uma fração de ponto percentual
 * de chance por extração, e as alternativas saíam praticamente aleatórias — o
 * efeito pedagógico se perdia. Com uma
 * vizinhança de 24, as opções erradas são reconhecidamente parecidas e ainda
 * assim variam bastante de uma sessão para outra.
 */
const NEIGHBOURHOOD_SIZE = 24;

/**
 * Peso base de qualquer candidato da vizinhança.
 *
 * Sem ele, as alternativas colapsariam sempre nas mesmas duas ou três
 * bandeiras mais parecidas, e o exercício voltaria a ser decorável — só que
 * por semelhança em vez de por ordem alfabética.
 */
const BASE_WEIGHT = 0.15;
const PALETTE_WEIGHT = 0.7;
const SUBREGION_WEIGHT = 0.3;

/**
 * O quanto duas bandeiras se confundem, em [0, 1].
 *
 * A cor domina porque é o que o olho compara primeiro; a sub-região entra como
 * reforço, já que bandeiras vizinhas costumam compartilhar repertório visual.
 * O reforço é da sub-região, e não do continente, porque as alternativas já
 * saem todas do mesmo continente (`choicePool`): lá o bônus seria igual para
 * todas e não distinguiria nada.
 */
export function confusability(
  left: DistractorCandidate,
  right: DistractorCandidate
): number {
  const byPalette = paletteSimilarity(left.palette, right.palette);
  const bySubregion = left.subregion === right.subregion ? 1 : 0;
  return PALETTE_WEIGHT * byPalette + SUBREGION_WEIGHT * bySubregion;
}

/**
 * De onde saem as alternativas: do continente da bandeira perguntada.
 *
 * Quem estuda as Américas e vê Kiribati e Fiji ao lado do Paraguai, que é o
 * que a paleta sozinha oferece, elimina as erradas pelo continente, sem olhar
 * para o desenho. Tirar as
 * alternativas do mesmo continente é o que obriga a comparar a bandeira. Vale
 * também para a revisão de um continente estudado antes, que continua vindo
 * com vizinhos do próprio continente.
 */
export function choicePool<T extends DistractorCandidate>(
  target: T,
  candidates: readonly T[]
): T[] {
  return candidates.filter(
    (candidate) => candidate.continent === target.continent
  );
}

/**
 * Monta as alternativas de uma questão: o alvo e seus distratores, já
 * embaralhados.
 *
 * Devolver o conjunto pronto — e não os distratores para o chamador juntar ao
 * alvo — torna dois erros inexprimíveis: esquecer de embaralhar, e deixar a
 * resposta certa sempre na mesma posição. Era o que acontecia antes, quando os
 * distratores vinham dos três primeiros países da região em ordem alfabética e
 * o "embaralhamento" ordenava por `JSON.stringify`.
 */
export function buildChoiceRound<T extends DistractorCandidate>(
  target: T,
  pool: readonly T[],
  optionCount: number,
  random: RandomSource
): T[] {
  if (optionCount < 2) {
    throw new RangeError("Uma questão de alternativas exige ao menos duas");
  }
  const candidates = pool.filter((candidate) => candidate.id !== target.id);
  if (candidates.length < optionCount - 1) {
    throw new Error(
      `Candidatos insuficientes para ${optionCount} alternativas de ${target.id}`
    );
  }

  // Empate de confundibilidade é desempatado pelo id, para que a vizinhança
  // não dependa da ordem em que o catálogo foi carregado.
  const neighbourhood = [...candidates]
    .sort((left, right) => {
      const delta = confusability(target, right) - confusability(target, left);
      return delta !== 0 ? delta : left.id.localeCompare(right.id);
    })
    .slice(0, Math.max(NEIGHBOURHOOD_SIZE, optionCount - 1));

  const distractors = weightedSample(
    neighbourhood,
    (candidate) => BASE_WEIGHT + confusability(target, candidate),
    optionCount - 1,
    random
  );

  return shuffle([target, ...distractors], random);
}
