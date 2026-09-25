import type { AttemptOutcome, ReviewAttempt } from "@/types/learning";

import { calendarDay } from "./scheduler";

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
 * depois da resposta certa; toda resposta depois do ensino é gravada como
 * correção pelo mesmo motivo (ver `attemptFlags`). O chute não pontua porque quem
 * marcou "Foi chute" disse que o acerto não foi reconhecimento.
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

export interface XpTotals {
  readonly today: number;
  readonly total: number;
}

/**
 * O XP do dia e o total, somados das tentativas guardadas.
 *
 * Não há contador à parte: um número guardado ao lado das tentativas pode
 * divergir delas, e aí não haveria como saber qual dos dois está certo. O
 * `awardedXp` de cada tentativa é somado como foi gravado, e não recalculado
 * pelo desfecho, para que uma mudança futura da regra não reescreva o
 * passado.
 *
 * "Hoje" é o dia no fuso gravado nas preferências, o mesmo que conta os dias
 * de sucesso do domínio. Com o fuso do aparelho, uma viagem mudaria o XP de
 * ontem.
 */
export function xpTotals(
  attempts: readonly ReviewAttempt[],
  timeZone: string,
  now: Date = new Date()
): XpTotals {
  const day = calendarDay(now, timeZone);
  let today = 0;
  let total = 0;
  for (const attempt of attempts) {
    total += attempt.awardedXp;
    if (calendarDay(new Date(attempt.createdAt), timeZone) === day) {
      today += attempt.awardedXp;
    }
  }
  return { today, total };
}
