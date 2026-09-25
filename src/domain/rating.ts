import { Rating, type Grade } from "ts-fsrs";

import type { ExerciseKind, ReviewAttempt } from "@/types/learning";

/**
 * Quantos acertos de primeira de um tipo de exercício a pessoa precisa ter
 * antes de o limiar de "rápido" passar a ser o dela.
 */
export const MIN_PERSONAL_SAMPLES = 10;

/**
 * O limiar de "rápido" antes de haver amostra pessoal, em milissegundos até a
 * primeira entrada. Valor inicial NÃO medido: é um chute conservador, que vale
 * até a pessoa ter `MIN_PERSONAL_SAMPLES` acertos limpos de primeira com tempo
 * medido naquele tipo de exercício, e então dá lugar ao percentil dela.
 * Conservador quer dizer baixo, porque promover a `Easy` sem motivo alonga o
 * intervalo de uma bandeira que talvez não esteja firme.
 *
 * A entrada de `flagToNameChoice` existe porque o tipo a exige, e nunca é
 * lida: a escolha do nome não move o FSRS.
 */
export const DEFAULT_FAST_FIRST_INPUT_MS: Readonly<
  Record<ExerciseKind, number>
> = {
  flagToNameInput: 2500,
  flagToNameChoice: 1800,
  nameToFlagChoice: 2200
};

/** O quartil mais rápido: acertos neste tempo ou menos viram `Easy`. */
const FAST_PERCENTILE = 0.25;

function isCleanFirstTry(attempt: ReviewAttempt): boolean {
  return (
    attempt.outcome === "correct" &&
    !attempt.isImmediateCorrection &&
    attempt.guessed !== true &&
    attempt.firstInputMs !== undefined
  );
}

/**
 * O tempo até a primeira entrada até o qual um acerto conta como rápido, para
 * um tipo de exercício.
 *
 * É relativo à pessoa e ao tipo de exercício, e não um número fixo para
 * todos: quem escolhe entre quatro bandeiras e quem digita um nome têm tempos
 * incomparáveis. Como o progresso mora no navegador, o histórico costuma ser o
 * de um aparelho só; a exceção é o backup restaurado em outro aparelho, que
 * leva junto os tempos do primeiro até as amostras novas os diluírem. O
 * percentil é o quartil mais rápido dos acertos limpos de primeira da pessoa.
 */
export function fastThresholdMs(
  exercise: ExerciseKind,
  history: readonly ReviewAttempt[]
): number {
  const samples = history
    .filter(
      (attempt) => attempt.exercise === exercise && isCleanFirstTry(attempt)
    )
    .map((attempt) => attempt.firstInputMs!)
    .sort((left, right) => left - right);
  if (samples.length < MIN_PERSONAL_SAMPLES) {
    return DEFAULT_FAST_FIRST_INPUT_MS[exercise];
  }
  const index = Math.max(0, Math.ceil(samples.length * FAST_PERCENTILE) - 1);
  return samples[index]!;
}

export interface RatingContext {
  /** Verdadeiro quando o cartão ainda não teve nenhuma revisão. */
  readonly firstReview?: boolean;
}

/**
 * Só o que veio antes da tentativa: um chamador que passasse o histórico já
 * com ela gravada deixaria a própria resposta entrar na amostra que a julga.
 */
function earlierThan(
  attempt: ReviewAttempt,
  history: readonly ReviewAttempt[]
): ReviewAttempt[] {
  const time = new Date(attempt.createdAt).getTime();
  // O tempo estritamente anterior já exclui a própria tentativa, que tem o
  // mesmo instante que ela.
  return history.filter((other) => new Date(other.createdAt).getTime() < time);
}

/**
 * A nota que o FSRS recebe por uma tentativa.
 *
 * A velocidade só promove: um acerto limpo e rápido vira `Easy`, e um acerto
 * lento continua `Good`, nunca `Hard`, porque lentidão pode ser teclado de
 * celular ou distração, e rebaixá-la encurtaria o intervalo sem motivo. O
 * parcial é `Hard` e nunca `Easy`, qualquer que seja o tempo. O chute
 * declarado é `Hard`. A correção imediata acerta a bandeira que acabou de
 * ver errada, e por isso não é promovida. Erro e pulo são `Again`.
 */
export function ratingForAttempt(
  attempt: ReviewAttempt,
  history: readonly ReviewAttempt[],
  context: RatingContext = {}
): Grade {
  switch (attempt.outcome) {
    case "incorrect":
    case "skipped":
      return Rating.Again;
    case "partial":
      return Rating.Hard;
    case "correct":
      if (attempt.guessed === true) return Rating.Hard;
      if (attempt.isImmediateCorrection || attempt.firstInputMs === undefined) {
        return Rating.Good;
      }
      // Na primeira vez que o cartão é visto, só a digitação promove. Quem
      // digita o nome certo de uma bandeira que ninguém lhe mostrou já o
      // sabia, e Easy poupa essa pessoa de aprender o que sabe. Um acerto em
      // escolha pode ser sorte, uma em quatro, e Easy num cartão novo pula a
      // aprendizagem: duas respostas assim bastariam para a estabilidade do
      // domínio. A digitação que vem logo depois de um ensino precisa chegar
      // aqui como correção imediata, senão o nome recém-mostrado viraria Easy.
      if (context.firstReview && attempt.exercise !== "flagToNameInput") {
        return Rating.Good;
      }
      return attempt.firstInputMs <=
        fastThresholdMs(attempt.exercise, earlierThan(attempt, history))
        ? Rating.Easy
        : Rating.Good;
  }
}
