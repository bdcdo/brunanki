import { createEmptyCard } from "ts-fsrs";
import { describe, expect, it } from "vitest";

import type { ReviewAttempt, SkillKind, SkillState } from "@/types/learning";

import { buildDailyQueue, newEntityOrder } from "../daily-queue";

function state(
  entityId: string,
  skill: SkillKind,
  due: string,
  lastOutcome: SkillState["lastOutcome"] = "correct"
): SkillState {
  const card = createEmptyCard(new Date(due));
  return {
    id: `${entityId}::${skill}`,
    entityId,
    skill,
    phase: "scheduled",
    card,
    distinctSuccessDays: [],
    lastOutcome,
    updatedAt: "2026-07-24T12:00:00.000Z"
  };
}

describe("buildDailyQueue", () => {
  it("ordena revisões vencidas, correções e novidades", () => {
    const queue = buildDailyQueue({
      entityOrder: ["brasil", "chile", "peru"],
      states: [
        state("brasil", "flagToNameRecall", "2026-07-24T10:00:00.000Z"),
        state(
          "chile",
          "flagToNameRecall",
          "2026-07-27T10:00:00.000Z",
          "incorrect"
        )
      ],
      now: new Date("2026-07-25T12:00:00.000Z"),
      baseNewLimit: 2
    });

    expect(queue.items).toEqual([
      {
        entityId: "brasil",
        skill: "flagToNameRecall",
        reason: "due"
      },
      {
        entityId: "chile",
        skill: "flagToNameRecall",
        reason: "correction"
      },
      {
        entityId: "brasil",
        skill: "nameToFlagRecognition",
        reason: "new"
      },
      {
        entityId: "chile",
        skill: "nameToFlagRecognition",
        reason: "new"
      }
    ]);
  });

  it("suspende novidades quando a precisão recente fica abaixo de 60%", () => {
    const attempts: ReviewAttempt[] = Array.from(
      { length: 10 },
      (_, index) => ({
        id: String(index),
        entityId: "brasil",
        skill: "flagToNameRecall",
        exercise: "flagToNameInput",
        outcome: index < 5 ? "correct" : "incorrect",
        isImmediateCorrection: false,
        mode: "scheduled",
        awardedXp: index < 5 ? 1 : 0,
        responseMs: 500,
        createdAt: `2026-07-${String(index + 1).padStart(2, "0")}T12:00:00.000Z`
      })
    );
    const queue = buildDailyQueue({
      entityOrder: ["brasil"],
      states: [],
      recentAttempts: attempts,
      baseNewLimit: 10
    });
    expect(queue.recentAccuracy).toBe(0.5);
    expect(queue.newLimit).toBe(0);
    expect(queue.items).toEqual([]);
  });
});

describe("newEntityOrder", () => {
  it("só oferece como novidade as bandeiras do continente em estudo", () => {
    const candidates = [
      { id: "fra", continent: "europe" as const },
      { id: "bra", continent: "americas" as const },
      { id: "jpn", continent: "asia" as const },
      { id: "arg", continent: "americas" as const }
    ];
    expect(newEntityOrder(candidates, "americas")).toEqual(["bra", "arg"]);
  });
});

describe("precisão recente", () => {
  it("ignora a prática livre ao decidir novidades", () => {
    // Dez erros em prática livre não podem suspender novidades: a prática
    // livre escolhe itens já conhecidos e não mede o que a fila pede.
    const free: ReviewAttempt[] = Array.from({ length: 10 }, (_, index) => ({
      id: `livre-${index}`,
      entityId: "brasil",
      skill: "flagToNameRecall",
      exercise: "flagToNameInput",
      outcome: "incorrect",
      isImmediateCorrection: false,
      mode: "free",
      awardedXp: 0,
      responseMs: 500,
      createdAt: `2026-07-${String(index + 1).padStart(2, "0")}T12:00:00.000Z`
    }));
    const queue = buildDailyQueue({
      entityOrder: ["brasil"],
      states: [],
      recentAttempts: free,
      baseNewLimit: 10
    });
    expect(queue.recentAccuracy).toBeNull();
    expect(queue.items).toHaveLength(1);
  });
});
