import type { AttemptOutcome } from "@/types/learning";

export interface XpInput {
  readonly outcome: AttemptOutcome;
  readonly isImmediateCorrection: boolean;
  readonly guessed?: boolean;
}

/**
 * XP mede atividade, e só a que acertou de primeira e por inteiro.
 *
 * Parcial e erro não pontuam porque XP por tentativa premiaria errar rápido.
 * A correção imediata não pontua porque é a mesma bandeira vista segundos
 * depois da resposta certa. O chute não pontua porque quem marcou "Foi chute"
 * disse que o acerto não foi reconhecimento.
 *
 * O XP nunca entra em agendamento, domínio ou desbloqueio: ele só é somado.
 */
export function awardedXpFor(attempt: XpInput): 0 | 1 {
  return attempt.outcome === "correct" &&
    !attempt.isImmediateCorrection &&
    attempt.guessed !== true
    ? 1
    : 0;
}
