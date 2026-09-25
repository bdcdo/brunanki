import { createEmptyCard, type Card } from "ts-fsrs";
import { describe, expect, it } from "vitest";

import { introductionOrder } from "@/data/curriculum";
import type {
  AttemptOutcome,
  SchedulingPreferences,
  SkillKind,
  SkillState
} from "@/types/learning";

import { dueCount, nextActivity } from "../next-activity";
import { createSkillState, scheduleAttempt, skillStateId } from "../scheduler";

const now = new Date("2026-09-24T12:00:00.000Z");
const minutes = (value: number) => new Date(now.getTime() + value * 60_000);

function scheduled(
  entityId: string,
  skill: SkillKind,
  due: Date,
  lastOutcome: AttemptOutcome = "correct"
): SkillState {
  return {
    id: skillStateId(entityId, skill),
    entityId,
    skill,
    phase: "scheduled",
    card: createEmptyCard<Card>(due),
    distinctSuccessDays: [],
    lastOutcome,
    updatedAt: now.toISOString()
  };
}

describe("nextActivity", () => {
  it("põe vencida antes de correção, e correção antes de novidade", () => {
    const states = [
      scheduled("chl", "flagToNameRecall", minutes(1), "incorrect"),
      scheduled("arg", "flagToNameRecall", minutes(-5))
    ];
    const order = ["bra", "arg", "chl"];
    expect(nextActivity({ states, entityOrder: order, now })).toEqual({
      entityId: "arg",
      skill: "flagToNameRecall",
      reason: "due"
    });
    const semVencida = [states[0]!];
    expect(
      nextActivity({ states: semVencida, entityOrder: order, now })
    ).toMatchObject({ entityId: "chl", reason: "correction" });
    expect(nextActivity({ states: [], entityOrder: order, now })).toEqual({
      entityId: "bra",
      skill: "flagToNameRecall",
      reason: "new"
    });
  });

  it("não puxa antes da hora o acerto que o FSRS marcou para daqui a dez minutos", () => {
    const states = [scheduled("bra", "flagToNameRecall", minutes(10))];
    // A próxima é a novidade seguinte, o reconhecimento do próprio Brasil, e
    // não a recordação que vence daqui a dez minutos.
    expect(nextActivity({ states, entityOrder: ["bra", "arg"], now })).toEqual({
      entityId: "bra",
      skill: "nameToFlagRecognition",
      reason: "new"
    });
  });

  it("não repete a bandeira recém-respondida se houver outra revisão", () => {
    const states = [
      scheduled("chl", "flagToNameRecall", minutes(1), "incorrect"),
      scheduled("arg", "flagToNameRecall", minutes(2), "incorrect")
    ];
    expect(
      nextActivity({
        states,
        entityOrder: [],
        now,
        justAnswered: { entityId: "chl", skill: "flagToNameRecall" }
      })
    ).toMatchObject({ entityId: "arg", reason: "correction" });
  });

  it("reinsere o erro antes da novidade seguinte, mesmo sem outra revisão", () => {
    const preferences: SchedulingPreferences = {
      desiredRetention: 0.9,
      timeZone: "America/Sao_Paulo"
    };
    const errado = scheduleAttempt(
      createSkillState("usa", "flagToNameRecall", now),
      {
        id: "a1",
        entityId: "usa",
        skill: "flagToNameRecall",
        exercise: "flagToNameInput",
        outcome: "incorrect",
        isImmediateCorrection: false,
        mode: "scheduled",
        awardedXp: 0,
        responseMs: 3000,
        createdAt: now.toISOString()
      },
      preferences
    );
    expect(
      nextActivity({
        states: [errado],
        entityOrder: ["usa", "can"],
        now: new Date(now.getTime() + 5_000),
        justAnswered: { entityId: "usa", skill: "flagToNameRecall" }
      })
    ).toMatchObject({ entityId: "usa", reason: "correction" });
  });

  it("introduz as 35 bandeiras das Américas sem teto", () => {
    // Acerta cada novidade de primeira, com o relógio parado: nenhuma revisão
    // vence no caminho, e o que decide é só a ordem, sem limite de sessão.
    const order = introductionOrder("americas");
    const preferences: SchedulingPreferences = {
      desiredRetention: 0.9,
      timeZone: "America/Sao_Paulo"
    };
    let states: SkillState[] = [];
    const introduzidas: string[] = [];
    for (let passo = 0; passo < 200; passo += 1) {
      const next = nextActivity({ states, entityOrder: order, now });
      if (!next) break;
      expect(next.reason).toBe("new");
      if (next.skill === "flagToNameRecall") introduzidas.push(next.entityId);
      const atual =
        states.find(
          (state) => state.id === skillStateId(next.entityId, next.skill)
        ) ?? createSkillState(next.entityId, next.skill, now);
      const depois = scheduleAttempt(
        atual,
        {
          id: `t${passo}`,
          entityId: next.entityId,
          skill: next.skill,
          exercise:
            next.skill === "flagToNameRecall"
              ? "flagToNameInput"
              : "nameToFlagChoice",
          outcome: "correct",
          isImmediateCorrection: false,
          mode: "scheduled",
          awardedXp: 1,
          responseMs: 2000,
          createdAt: now.toISOString()
        },
        preferences
      );
      states = [...states.filter(({ id }) => id !== depois.id), depois];
    }
    expect(introduzidas).toEqual([...order]);
    expect(introduzidas).toHaveLength(35);
  });

  it("devolve nada quando não há o que fazer", () => {
    expect(
      nextActivity({
        states: [scheduled("bra", "flagToNameRecall", minutes(60 * 24))],
        entityOrder: [],
        now
      })
    ).toBeUndefined();
  });
});

describe("dueCount", () => {
  it("conta só o que já venceu", () => {
    expect(
      dueCount(
        [
          scheduled("bra", "flagToNameRecall", minutes(-1)),
          scheduled("arg", "flagToNameRecall", minutes(1))
        ],
        now
      )
    ).toBe(1);
  });
});
