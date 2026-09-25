import { State, createEmptyCard } from "ts-fsrs";
import { describe, expect, it } from "vitest";

import type {
  ReviewAttempt,
  SchedulingPreferences,
  SkillState
} from "@/types/learning";

import { getMasteryStatus } from "../mastery";
import { createSkillState, scheduleAttempt } from "../scheduler";
import { awardedXpFor } from "../xp";

function attempt(
  outcome: ReviewAttempt["outcome"],
  createdAt: string,
  isImmediateCorrection = false
): ReviewAttempt {
  return {
    id: `${outcome}-${createdAt}`,
    entityId: "brasil",
    skill: "flagToNameRecall",
    exercise: "flagToNameInput",
    outcome,
    isImmediateCorrection,
    mode: "scheduled",
    awardedXp: awardedXpFor({ outcome, isImmediateCorrection }),
    responseMs: 800,
    createdAt
  };
}

const saoPaulo: SchedulingPreferences = {
  desiredRetention: 0.9,
  timeZone: "America/Sao_Paulo"
};

describe("scheduleAttempt", () => {
  it("não deixa a escolha na direção bandeira→nome contar para a recordação", () => {
    // Acertar entre quatro nomes não prova que a pessoa sabe escrever o nome:
    // nem o cartão nem os dias de sucesso mudam.
    const initial = createSkillState(
      "brasil",
      "flagToNameRecall",
      new Date("2026-07-24T12:00:00Z")
    );
    const choice: ReviewAttempt = {
      ...attempt("correct", "2026-07-24T12:00:00.000Z"),
      exercise: "flagToNameChoice"
    };
    expect(scheduleAttempt(initial, choice, saoPaulo)).toBe(initial);
  });

  it("não conta chute declarado como dia de sucesso", () => {
    const initial = createSkillState(
      "brasil",
      "nameToFlagRecognition",
      new Date("2026-07-24T12:00:00Z")
    );
    const guessed: ReviewAttempt = {
      ...attempt("correct", "2026-07-24T12:00:00.000Z"),
      skill: "nameToFlagRecognition",
      exercise: "nameToFlagChoice",
      guessed: true,
      awardedXp: 0
    };
    expect(
      scheduleAttempt(initial, guessed, saoPaulo).distinctSuccessDays
    ).toEqual([]);
  });

  it("cria e atualiza um cartão independente por entidade e habilidade", () => {
    const initial = createSkillState(
      "brasil",
      "flagToNameRecall",
      new Date("2026-07-25T12:00:00Z")
    );
    const updated = scheduleAttempt(
      initial,
      attempt("correct", "2026-07-25T12:01:00.000Z"),
      saoPaulo
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
      attempt("correct", "2026-07-25T12:01:00.000Z", true),
      saoPaulo
    );
    expect(updated.distinctSuccessDays).toEqual([]);
  });

  it("registra sucessos apenas uma vez por dia no fuso informado", () => {
    const initial = createSkillState("brasil", "flagToNameRecall");
    const first = scheduleAttempt(
      initial,
      attempt("correct", "2026-07-25T02:30:00.000Z"),
      saoPaulo
    );
    const second = scheduleAttempt(
      first,
      attempt("correct", "2026-07-25T03:30:00.000Z"),
      saoPaulo
    );
    expect(second.distinctSuccessDays).toEqual(["2026-07-24", "2026-07-25"]);
  });

  it("conta o dia de calendário no fuso de quem estuda", () => {
    // 02:30Z é 23:30 do dia anterior em São Paulo e 11:30 do mesmo dia em
    // Tóquio: sem o fuso certo, os dias distintos de sucesso saem errados.
    const initial = createSkillState("brasil", "flagToNameRecall");
    const inSaoPaulo = scheduleAttempt(
      initial,
      attempt("correct", "2026-07-25T02:30:00.000Z"),
      saoPaulo
    );
    const inTokyo = scheduleAttempt(
      initial,
      attempt("correct", "2026-07-25T02:30:00.000Z"),
      { desiredRetention: 0.9, timeZone: "Asia/Tokyo" }
    );

    expect(inSaoPaulo.distinctSuccessDays).toEqual(["2026-07-24"]);
    expect(inTokyo.distinctSuccessDays).toEqual(["2026-07-25"]);
  });

  it("aplica a retenção desejada ao intervalo agendado", () => {
    // Prova que a preferência chega ao FSRS: antes ela existia no tipo, na
    // tabela e no schema, mas nunca era passada ao agendador.
    //
    // Precisa de um cartão já em revisão: enquanto o cartão está em
    // aprendizado, o intervalo vem dos learning steps fixos do FSRS e não
    // responde à retenção desejada.
    const mature = masteredState("flagToNameRecall");
    // createEmptyCard deixa difficulty em 0, que o FSRS recusa num cartão já
    // em revisão; o valor abaixo é uma dificuldade média plausível.
    mature.card!.difficulty = 5;
    const conservative = scheduleAttempt(
      mature,
      attempt("correct", "2026-08-25T12:00:00.000Z"),
      { desiredRetention: 0.97, timeZone: "America/Sao_Paulo" }
    );
    const relaxed = scheduleAttempt(
      mature,
      attempt("correct", "2026-08-25T12:00:00.000Z"),
      { desiredRetention: 0.8, timeZone: "America/Sao_Paulo" }
    );

    // Reter mais exige revisar antes.
    expect(conservative.card?.due.getTime()).toBeLessThan(
      relaxed.card?.due.getTime() ?? 0
    );
  });
});

function masteredState(
  skill: SkillState["skill"],
  lastOutcome: SkillState["lastOutcome"] = "correct"
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
    updatedAt: "2026-07-25T12:00:00.000Z"
  };
}

describe("getMasteryStatus", () => {
  it("exige as duas habilidades, dois dias e estabilidade de 30 dias", () => {
    expect(
      getMasteryStatus("brasil", [
        masteredState("flagToNameRecall"),
        masteredState("nameToFlagRecognition")
      ])
    ).toEqual({
      mastered: true,
      missingSkills: [],
      reason: "mastered"
    });
  });

  it("remove temporariamente o domínio após uma falha", () => {
    expect(
      getMasteryStatus("brasil", [
        masteredState("flagToNameRecall", "incorrect"),
        masteredState("nameToFlagRecognition")
      ]).reason
    ).toBe("latest-attempt-not-correct");
  });
});
