import { State, createEmptyCard } from "ts-fsrs";
import { describe, expect, it } from "vitest";

import type { ReviewAttempt, SkillKind, SkillState } from "@/types/learning";

import { entityStage, isEntityMastered, summarizeProgress } from "../mastery";

/**
 * Estado maduro: cartão em revisão, estabilidade no limiar de domínio e dois
 * dias distintos de acerto.
 */
function state(
  entityId: string,
  skill: SkillKind,
  overrides: Partial<SkillState> = {}
): SkillState {
  const card = createEmptyCard(new Date("2026-07-25T12:00:00Z"));
  card.stability = 30;
  card.difficulty = 5;
  card.state = State.Review;
  return {
    id: `${entityId}::${skill}`,
    entityId,
    skill,
    phase: "scheduled",
    card,
    distinctSuccessDays: ["2026-07-24", "2026-07-25"],
    lastOutcome: "correct",
    updatedAt: "2026-07-25T12:00:00.000Z",
    ...overrides
  };
}

/**
 * Estado em aquisição, coerente com o que o agendador produz: `phase` é
 * derivada de `card.state` por phaseForCard, então uma habilidade em
 * aquisição tem cartão fora de State.Review e estabilidade ainda baixa. Um
 * fixture que fixasse apenas `phase` descreveria um estado que o agendador
 * nunca gera.
 */
function acquiringState(entityId: string, skill: SkillKind): SkillState {
  const card = createEmptyCard(new Date("2026-07-25T12:00:00Z"));
  card.stability = 1.2;
  card.difficulty = 5;
  card.state = State.Learning;
  return {
    id: `${entityId}::${skill}`,
    entityId,
    skill,
    phase: "acquiring",
    card,
    distinctSuccessDays: ["2026-07-25"],
    lastOutcome: "correct",
    updatedAt: "2026-07-25T12:00:00.000Z"
  };
}

function bothSkills(
  entityId: string,
  overrides: Partial<SkillState> = {}
): SkillState[] {
  return [
    state(entityId, "flagToNameRecall", overrides),
    state(entityId, "nameToFlagRecognition", overrides)
  ];
}

function attempt(overrides: Partial<ReviewAttempt> = {}): ReviewAttempt {
  return {
    id: Math.random().toString(36),
    entityId: "bra",
    skill: "flagToNameRecall",
    exercise: "flagToNameInput",
    outcome: "correct",
    isImmediateCorrection: false,
    mode: "scheduled",
    awardedXp: 1,
    responseMs: 800,
    createdAt: "2026-07-25T12:00:00.000Z",
    ...overrides
  };
}

describe("entityStage", () => {
  it("concorda com a regra de domínio sobre o que é dominado", () => {
    // A tela antiga não verificava lastOutcome e considerava dominada uma
    // entidade cuja última tentativa fora um erro.
    const failed = bothSkills("bra", { lastOutcome: "incorrect" });
    expect(isEntityMastered("bra", failed)).toBe(false);
    expect(entityStage("bra", failed)).not.toBe("mastered");

    const mastered = bothSkills("bra");
    expect(isEntityMastered("bra", mastered)).toBe(true);
    expect(entityStage("bra", mastered)).toBe("mastered");
  });

  it("dá um único estágio a uma entidade com habilidades em fases distintas", () => {
    // Este é o caso que a tela antiga contava duas vezes: uma vez em "em
    // aprendizagem" e outra em "em revisão".
    const mixed = [
      acquiringState("bra", "flagToNameRecall"),
      state("bra", "nameToFlagRecognition")
    ];
    expect(entityStage("bra", mixed)).toBe("acquiring");
  });

  it("trata entidade sem estado como não vista", () => {
    expect(entityStage("bra", [])).toBe("unseen");
    expect(entityStage("bra", bothSkills("bra", { phase: "unseen" }))).toBe(
      "unseen"
    );
  });

  it("exige as duas direções para dominar", () => {
    expect(entityStage("bra", [state("bra", "flagToNameRecall")])).toBe(
      "reviewing"
    );
  });
});

describe("summarizeProgress", () => {
  it("distribui cada entidade em exatamente um estágio", () => {
    const states = [
      ...bothSkills("bra"),
      acquiringState("jpn", "flagToNameRecall"),
      state("jpn", "nameToFlagRecognition"),
      ...bothSkills("zaf", { lastOutcome: "incorrect" })
    ];
    const summary = summarizeProgress(["bra", "jpn", "zaf", "civ"], states, []);

    const soma = Object.values(summary.byStage).reduce((a, b) => a + b, 0);
    expect(soma).toBe(summary.total);
    expect(summary.byStage).toEqual({
      unseen: 1,
      acquiring: 1,
      reviewing: 1,
      mastered: 1
    });
  });

  it("não conta correção imediata como acerto de primeira", () => {
    const summary = summarizeProgress(
      [],
      [],
      [
        attempt(),
        attempt({ isImmediateCorrection: true }),
        attempt({ outcome: "incorrect" })
      ]
    );
    expect(summary.firstTryCorrect).toBe(1);
  });
});
