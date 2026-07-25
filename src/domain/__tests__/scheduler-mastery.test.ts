import { State, createEmptyCard } from "ts-fsrs";
import { describe, expect, it } from "vitest";

import type { ReviewAttempt, SkillState } from "@/types/learning";

import { getMasteryStatus } from "../mastery";
import {
  createSkillState,
  ratingForOutcome,
  scheduleAttempt,
} from "../scheduler";

function attempt(
  outcome: ReviewAttempt["outcome"],
  createdAt: string,
): ReviewAttempt {
  return {
    id: `${outcome}-${createdAt}`,
    entityId: "brasil",
    skill: "flagToNameRecall",
    exercise: "flagToNameInput",
    outcome,
    responseMs: 800,
    createdAt,
  };
}

describe("scheduleAttempt", () => {
  it("mapeia resultados para Again, Hard e Good", () => {
    expect(ratingForOutcome("incorrect")).toBe(1);
    expect(ratingForOutcome("skipped")).toBe(1);
    expect(ratingForOutcome("partial")).toBe(2);
    expect(ratingForOutcome("correct")).toBe(3);
  });

  it("cria e atualiza um cartão independente por entidade e habilidade", () => {
    const initial = createSkillState(
      "brasil",
      "flagToNameRecall",
      new Date("2026-07-25T12:00:00Z"),
    );
    const updated = scheduleAttempt(
      initial,
      attempt("correct", "2026-07-25T12:01:00.000Z"),
    );

    expect(updated.id).toBe("brasil::flagToNameRecall");
    expect(updated.card?.reps).toBe(1);
    expect(updated.lastOutcome).toBe("correct");
    expect(updated.distinctSuccessDays).toEqual(["2026-07-25"]);
    expect(updated.phase).not.toBe("unseen");
  });

  it("não usa a correção imediata como evidência de retenção", () => {
    const initial = createSkillState("brasil", "flagToNameRecall");
    const updated = scheduleAttempt(
      initial,
      attempt("correct", "2026-07-25T12:01:00.000Z"),
      { isImmediateCorrection: true },
    );
    expect(updated.distinctSuccessDays).toEqual([]);
  });

  it("registra sucessos apenas uma vez por dia no fuso do produto", () => {
    const initial = createSkillState("brasil", "flagToNameRecall");
    const first = scheduleAttempt(
      initial,
      attempt("correct", "2026-07-25T02:30:00.000Z"),
    );
    const second = scheduleAttempt(
      first,
      attempt("correct", "2026-07-25T03:30:00.000Z"),
    );
    expect(second.distinctSuccessDays).toEqual([
      "2026-07-24",
      "2026-07-25",
    ]);
  });
});

function masteredState(
  skill: SkillState["skill"],
  lastOutcome: SkillState["lastOutcome"] = "correct",
): SkillState {
  const card = createEmptyCard(new Date("2026-07-25T12:00:00Z"));
  card.stability = 30;
  card.state = State.Review;
  return {
    id: `brasil::${skill}`,
    entityId: "brasil",
    skill,
    phase: "scheduled",
    card,
    distinctSuccessDays: ["2026-07-24", "2026-07-25"],
    lastOutcome,
    updatedAt: "2026-07-25T12:00:00.000Z",
  };
}

describe("getMasteryStatus", () => {
  it("exige as duas habilidades, dois dias e estabilidade de 30 dias", () => {
    expect(
      getMasteryStatus("brasil", [
        masteredState("flagToNameRecall"),
        masteredState("nameToFlagRecognition"),
      ]),
    ).toEqual({
      mastered: true,
      missingSkills: [],
      reason: "mastered",
    });
  });

  it("remove temporariamente o domínio após uma falha", () => {
    expect(
      getMasteryStatus("brasil", [
        masteredState("flagToNameRecall", "incorrect"),
        masteredState("nameToFlagRecognition"),
      ]).reason,
    ).toBe("latest-attempt-not-correct");
  });
});
