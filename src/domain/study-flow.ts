import type {
  AttemptOutcome,
  ReviewAttempt,
  SkillKind
} from "@/types/learning";

import type { ActivityReason } from "./next-activity";
import { awardedXpFor } from "./xp";

/**
 * Os passos de uma atividade da sessão.
 *
 * `firstContact` é a primeira pergunta de uma bandeira nova, antes de
 * qualquer ensino (ADR-0011). Os quatro seguintes, de `teach` a
 * `reverseChoice`, são o pacote de ensino, que só roda quando o primeiro
 * contato termina em erro ou "Não sei". `forwardInput` e `reverseChoice`
 * também aparecem sozinhos, como a pergunta de uma revisão.
 */
export type StudyStep =
  "firstContact" | "teach" | "forwardChoice" | "forwardInput" | "reverseChoice";

/** O que a fila pediu, e em que ponto do pacote de ensino a atividade está. */
export interface StudyPosition {
  readonly step: StudyStep;
  /**
   * Verdadeiro depois que a bandeira foi mostrada com o nome nesta atividade.
   * Toda resposta a partir daí acerta o que acabou de ser visto, e não prova
   * memória: é o que `attemptFlags` usa.
   */
  readonly taught: boolean;
}

/**
 * O primeiro passo de uma atividade que a fila escolheu.
 *
 * Só a bandeira nova começa pelo primeiro contato. Uma revisão vencida ou uma
 * correção vai direto à pergunta: o veredito do erro que a gerou já mostrou o
 * nome certo e o traço que o distingue, e ensinar de novo antes de perguntar
 * trocaria a recuperação por releitura.
 */
export function initialPosition(item: {
  readonly skill: SkillKind;
  readonly reason: ActivityReason;
}): StudyPosition {
  if (item.skill === "nameToFlagRecognition") {
    return { step: "reverseChoice", taught: false };
  }
  return {
    step: item.reason === "new" ? "firstContact" : "forwardInput",
    taught: false
  };
}

/**
 * O passo que segue uma resposta, ou `undefined` quando a atividade acabou e
 * a fila deve escolher a próxima.
 *
 * O pacote é indivisível: de `teach` a `reverseChoice` nenhum passo devolve o
 * controle à fila, então nenhuma outra novidade ou revisão se intercala antes
 * de a bandeira ter sido vista nas duas direções.
 */
export function nextPosition(
  position: StudyPosition,
  outcome?: AttemptOutcome
): StudyPosition | undefined {
  switch (position.step) {
    case "firstContact":
      // Acerto, inteiro ou parcial, dispensa o ensino: a pessoa já reconhece
      // a bandeira, e o FSRS a leva ao ciclo de revisões com a nota que a
      // resposta mereceu.
      return outcome === "incorrect" || outcome === "skipped"
        ? { step: "teach", taught: true }
        : undefined;
    case "teach":
      return { step: "forwardChoice", taught: true };
    case "forwardChoice":
      return { step: "forwardInput", taught: true };
    case "forwardInput":
      return position.taught
        ? { step: "reverseChoice", taught: true }
        : undefined;
    case "reverseChoice":
      return undefined;
  }
}

/** A habilidade que o passo exercita, e que a tentativa grava. */
export function skillForStep(step: StudyStep): SkillKind {
  return step === "reverseChoice"
    ? "nameToFlagRecognition"
    : "flagToNameRecall";
}

/**
 * As marcas da tentativa que dependem de onde ela aconteceu.
 *
 * Depois do ensino, e numa correção pedida pela fila, a resposta acerta uma
 * bandeira vista segundos antes. Gravá-la como correção imediata faz o
 * agendador não a promover a `Easy`, o percentil de velocidade não a contar
 * como amostra, o domínio não a contar como dia de sucesso e o XP não a
 * pontuar. Sem isso, um clique rápido vinte segundos depois do ensino daria
 * à bandeira recém-vista o intervalo de uma que a pessoa sempre soube.
 */
export function attemptFlags(
  position: StudyPosition,
  reason: ActivityReason
): { readonly isImmediateCorrection: boolean } {
  return { isImmediateCorrection: position.taught || reason === "correction" };
}

/**
 * A tentativa reescrita depois de "Foi chute".
 *
 * A marca rebaixa a nota a `Hard` e tira o XP. Só vale para acerto em
 * escolha: num erro não há o que rebaixar, e na digitação não se chuta um
 * nome.
 */
export function markedAsGuess(attempt: ReviewAttempt): ReviewAttempt {
  if (attempt.outcome !== "correct" || attempt.exercise === "flagToNameInput") {
    throw new Error("Só um acerto em escolha pode ser marcado como chute");
  }
  const guessed = { ...attempt, guessed: true };
  return { ...guessed, awardedXp: awardedXpFor(guessed) };
}
