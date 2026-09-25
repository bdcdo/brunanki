import { describe, expect, it } from "vitest";

import type { AttemptOutcome } from "@/types/learning";

import { awardedXpFor } from "../xp";

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
