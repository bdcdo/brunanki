import type { CuratedPair } from "@/types/curriculum";
import type { AttemptOutcome } from "@/types/learning";
import type { ContinentId, SubregionId } from "@/types/geography";
import { CONTINENT_LABEL_PT_BR, SUBREGION } from "@/types/geography";

export interface FeedbackEntity {
  readonly id: string;
  readonly displayNamePtBr: string;
  readonly continent: ContinentId;
  readonly subregion: SubregionId;
}

function capitalize(text: string): string {
  return text.charAt(0).toLocaleUpperCase("pt-BR") + text.slice(1);
}

function findPair(
  pairs: readonly CuratedPair[],
  first: string,
  second: string
): CuratedPair | undefined {
  return pairs.find(
    ({ entityIds: [left, right] }) =>
      (left === first && right === second) ||
      (left === second && right === first)
  );
}

// Rótulo seguido de dois-pontos, e não "fica na América do Sul": cada
// sub-região pede o próprio artigo ("no Caribe", "no Sul da Ásia"), e uma
// tabela de artigos seria mais uma coisa para desatualizar.
function whereIs(entity: FeedbackEntity): string {
  const subregion = SUBREGION[entity.subregion].labelPtBr;
  const continent = CONTINENT_LABEL_PT_BR[entity.continent];
  return subregion === continent ? subregion : `${subregion}, ${continent}`;
}

/**
 * O que distingue a bandeira certa da que a pessoa escolheu.
 *
 * Com par curado, os dois traços, primeiro o da certa: é ela que a pessoa
 * precisa reconhecer da próxima vez. Sem par curado, só o que é fato sobre as
 * duas, a região de cada uma, e nenhuma distinção inventada: uma frase de
 * desenho escrita sem curadoria seria errada com frequência suficiente para
 * ensinar o contrário.
 *
 * O texto não fala de fila, de revisão nem de quando a bandeira volta. O
 * veredito é sobre a bandeira; o agendamento não é assunto de quem acabou de
 * errar.
 */
export function mistakeExplanation(
  chosen: FeedbackEntity,
  correct: FeedbackEntity,
  pairs: readonly CuratedPair[]
): string {
  const pair = findPair(pairs, chosen.id, correct.id);
  if (pair) {
    return `${capitalize(pair.traits[correct.id]!)}; ${pair.traits[chosen.id]}.`;
  }
  if (chosen.subregion === correct.subregion) {
    return `As duas são da mesma sub-região: ${whereIs(correct)}.`;
  }
  return `${correct.displayNamePtBr}: ${whereIs(correct)}. ${chosen.displayNamePtBr}: ${whereIs(chosen)}.`;
}

/**
 * O traço de uma bandeira diante do par mais próximo dela, para reforçar um
 * acerto. Sem par curado não há o que dizer, e o acerto fica sem explicação.
 */
export function distinctiveTrait(
  entity: FeedbackEntity,
  pairs: readonly CuratedPair[]
): string | undefined {
  const pair = pairs.find(({ entityIds }) => entityIds.includes(entity.id));
  const trait = pair?.traits[entity.id];
  return trait ? `${capitalize(trait)}.` : undefined;
}

/**
 * A explicação do veredito, por desfecho.
 *
 * Erro com outra bandeira identificada, seja a alternativa tocada ou um nome
 * digitado que é de outro país, recebe a distinção entre as duas. Erro sem
 * bandeira identificada e acerto recebem o traço da certa, quando houver. O
 * parcial é acerto de reconhecimento com grafia diferente, e diz isso.
 */
export function verdictExplanation(
  outcome: AttemptOutcome,
  correct: FeedbackEntity,
  chosen: FeedbackEntity | undefined,
  pairs: readonly CuratedPair[]
): string | undefined {
  if (outcome === "partial") {
    return "Você reconheceu a bandeira; só a grafia saiu diferente.";
  }
  if (outcome !== "correct" && chosen && chosen.id !== correct.id) {
    return mistakeExplanation(chosen, correct, pairs);
  }
  return distinctiveTrait(correct, pairs);
}
