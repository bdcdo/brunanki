import type {
  AttemptOutcome,
  ExerciseKind,
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
 * Só a bandeira nova começa pelo primeiro contato. A correção vai direto à
 * pergunta porque o veredito do erro que a gerou já mostrou o nome certo e o
 * traço que o distingue; a revisão vencida, porque perguntar é a revisão.
 * Ensinar antes trocaria a recuperação por releitura.
 *
 * `justShown` é a bandeira que a pessoa acabou de ver com o nome fora da
 * sessão, na página do álbum de onde a puxou. A pergunta continua sendo o
 * primeiro contato, mas já ensinada: acertar o nome lido segundos antes não é
 * evidência de que a pessoa o sabia.
 */
export function initialPosition(
  item: { readonly skill: SkillKind; readonly reason: ActivityReason },
  options: { readonly justShown?: boolean } = {}
): StudyPosition {
  if (item.skill === "nameToFlagRecognition") {
    return { step: "reverseChoice", taught: false };
  }
  if (item.reason !== "new") return { step: "forwardInput", taught: false };
  return { step: "firstContact", taught: options.justShown === true };
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

/** O exercício que o passo grava. A apresentação não grava tentativa. */
export function exerciseForStep(
  step: Exclude<StudyStep, "teach">
): ExerciseKind {
  switch (step) {
    case "firstContact":
    case "forwardInput":
      return "flagToNameInput";
    case "forwardChoice":
      return "flagToNameChoice";
    case "reverseChoice":
      return "nameToFlagChoice";
  }
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
 * Se a tentativa admite "Foi chute": acerto na escolha da bandeira pelo nome.
 *
 * Num erro não há o que rebaixar, e na digitação não se chuta um nome. A
 * escolha do nome, que só existe depois da apresentação, fica de fora porque
 * a marca não mudaria nada nela: ela não move o FSRS nem pontua, e um botão
 * que não muda nada prometeria o que não acontece.
 */
export function canMarkAsGuess(attempt: ReviewAttempt): boolean {
  return (
    attempt.outcome === "correct" && attempt.exercise === "nameToFlagChoice"
  );
}

/** A tentativa reescrita depois de "Foi chute": nota `Hard` e sem XP. */
export function markedAsGuess(attempt: ReviewAttempt): ReviewAttempt {
  if (!canMarkAsGuess(attempt)) {
    throw new Error("Só um acerto na escolha da bandeira pode ser chute");
  }
  const guessed = { ...attempt, guessed: true };
  return { ...guessed, awardedXp: awardedXpFor(guessed) };
}
