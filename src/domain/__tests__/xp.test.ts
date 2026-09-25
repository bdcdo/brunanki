import { describe, expect, it } from "vitest";

import type { AttemptOutcome, ReviewAttempt } from "@/types/learning";

import { awardedXpFor, xpTotals } from "../xp";

describe("awardedXpFor", () => {
  const outcomes: readonly [AttemptOutcome, 0 | 1][] = [
    ["correct", 1],
    ["partial", 0],
    ["incorrect", 0],
    ["skipped", 0]
  ];

  it.each(outcomes)("resposta de primeira %s vale %i", (outcome, xp) => {
    expect(awardedXpFor({ outcome, isImmediateCorrection: false })).toBe(xp);
  });

  it.each(outcomes)("correção imediata %s nunca pontua", (outcome) => {
    expect(awardedXpFor({ outcome, isImmediateCorrection: true })).toBe(0);
  });

  it("a escolha logo depois da apresentação não pontua", () => {
    expect(
      awardedXpFor({
        outcome: "correct",
        isImmediateCorrection: false,
        followsTeaching: true
      })
    ).toBe(0);
  });

  it("acerto marcado como chute não pontua", () => {
    expect(
      awardedXpFor({
        outcome: "correct",
        isImmediateCorrection: false,
        guessed: true
      })
    ).toBe(0);
  });

  it("acerto sem marca de chute pontua mesmo com o campo explícito", () => {
    expect(
      awardedXpFor({
        outcome: "correct",
        isImmediateCorrection: false,
        guessed: false
      })
    ).toBe(1);
  });
});

function attemptAt(
  createdAt: string,
  awardedXp: 0 | 1,
  outcome: AttemptOutcome = awardedXp === 1 ? "correct" : "incorrect"
): ReviewAttempt {
  return {
    id: createdAt,
    entityId: "bra",
    skill: "flagToNameRecall",
    exercise: "flagToNameInput",
    outcome,
    isImmediateCorrection: false,
    mode: "scheduled",
    awardedXp,
    responseMs: 1000,
    createdAt
  };
}

describe("xpTotals", () => {
  // 22h de 24/09 em São Paulo, e já 25/09 em UTC.
  const now = new Date("2026-09-25T01:00:00.000Z");
  const attempts = [
    // 23h de 23/09 em São Paulo: ontem.
    attemptAt("2026-09-24T02:00:00.000Z", 1),
    // 9h de 24/09 em São Paulo: hoje, embora seja ontem em UTC.
    attemptAt("2026-09-24T12:00:00.000Z", 1),
    attemptAt("2026-09-24T12:05:00.000Z", 0),
    // 21h30 de 24/09 em São Paulo: hoje.
    attemptAt("2026-09-25T00:30:00.000Z", 1)
  ];

  it("conta como hoje o dia local do fuso gravado, e não o de UTC", () => {
    expect(xpTotals(attempts, "America/Sao_Paulo", now)).toEqual({
      today: 2,
      total: 3
    });
    expect(xpTotals(attempts, "UTC", now)).toEqual({ today: 1, total: 3 });
  });

  it("a virada da data zera o dia e não mexe no total", () => {
    const tomorrow = new Date("2026-09-25T15:00:00.000Z");
    expect(xpTotals(attempts, "America/Sao_Paulo", tomorrow)).toEqual({
      today: 0,
      total: 3
    });
  });

  it("soma o XP gravado, sem recalculá-lo pelo desfecho", () => {
    // Um acerto que a regra não pontuou, como a escolha logo depois da
    // apresentação, continua valendo zero.
    const unscored = attemptAt("2026-09-24T13:00:00.000Z", 0, "correct");
    expect(xpTotals([unscored], "America/Sao_Paulo", now)).toEqual({
      today: 0,
      total: 0
    });
  });

  it("sem tentativas, zero nos dois", () => {
    expect(xpTotals([], "America/Sao_Paulo", now)).toEqual({
      today: 0,
      total: 0
    });
  });
});
