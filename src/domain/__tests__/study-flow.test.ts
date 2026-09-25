import { describe, expect, it } from "vitest";

import type { AttemptOutcome, ReviewAttempt } from "@/types/learning";

import {
  attemptFlags,
  initialPosition,
  markedAsGuess,
  nextPosition,
  skillForStep,
  type StudyPosition
} from "../study-flow";

/** Percorre a atividade até a fila retomar, respondendo sempre `outcome`. */
function walk(
  start: StudyPosition,
  outcomes: readonly AttemptOutcome[]
): string[] {
  const steps: string[] = [];
  let position: StudyPosition | undefined = start;
  let index = 0;
  while (position) {
    steps.push(position.step);
    const outcome =
      position.step === "teach" ? undefined : (outcomes[index++] ?? "correct");
    position = nextPosition(position, outcome);
  }
  return steps;
}

describe("initialPosition", () => {
  it("bandeira nova começa pela pergunta, e não pelo ensino", () => {
    expect(
      initialPosition({ skill: "flagToNameRecall", reason: "new" })
    ).toEqual({ step: "firstContact", taught: false });
  });

  it("revisão e correção vão direto à digitação", () => {
    for (const reason of ["due", "correction"] as const) {
      expect(initialPosition({ skill: "flagToNameRecall", reason })).toEqual({
        step: "forwardInput",
        taught: false
      });
    }
  });

  it("o reconhecimento é sempre a escolha da bandeira", () => {
    for (const reason of ["new", "due", "correction"] as const) {
      expect(
        initialPosition({ skill: "nameToFlagRecognition", reason }).step
      ).toBe("reverseChoice");
    }
  });
});

describe("nextPosition", () => {
  const firstContact = initialPosition({
    skill: "flagToNameRecall",
    reason: "new"
  });

  it.each(["correct", "partial"] as const)(
    "%s no primeiro contato devolve à fila sem ensino",
    (outcome) => {
      expect(walk(firstContact, [outcome])).toEqual(["firstContact"]);
    }
  );

  it.each(["incorrect", "skipped"] as const)(
    "%s no primeiro contato abre o pacote inteiro, na ordem",
    (outcome) => {
      expect(walk(firstContact, [outcome])).toEqual([
        "firstContact",
        "teach",
        "forwardChoice",
        "forwardInput",
        "reverseChoice"
      ]);
    }
  );

  it("errar dentro do pacote não o encurta nem o repete", () => {
    expect(
      walk(firstContact, ["skipped", "incorrect", "incorrect", "incorrect"])
    ).toEqual([
      "firstContact",
      "teach",
      "forwardChoice",
      "forwardInput",
      "reverseChoice"
    ]);
  });

  it("a digitação de uma revisão termina a atividade", () => {
    const review = initialPosition({
      skill: "flagToNameRecall",
      reason: "due"
    });
    expect(walk(review, ["incorrect"])).toEqual(["forwardInput"]);
    expect(walk(review, ["correct"])).toEqual(["forwardInput"]);
  });

  it("a escolha de uma revisão de reconhecimento termina a atividade", () => {
    const review = initialPosition({
      skill: "nameToFlagRecognition",
      reason: "due"
    });
    expect(walk(review, ["incorrect"])).toEqual(["reverseChoice"]);
  });
});

describe("skillForStep", () => {
  it("só a escolha da bandeira exercita o reconhecimento", () => {
    expect(skillForStep("reverseChoice")).toBe("nameToFlagRecognition");
    for (const step of [
      "firstContact",
      "teach",
      "forwardChoice",
      "forwardInput"
    ] as const) {
      expect(skillForStep(step)).toBe("flagToNameRecall");
    }
  });
});

describe("attemptFlags", () => {
  it("o primeiro contato e a revisão não são correção", () => {
    expect(
      attemptFlags({ step: "firstContact", taught: false }, "new")
    ).toEqual({ isImmediateCorrection: false });
    expect(
      attemptFlags({ step: "forwardInput", taught: false }, "due")
    ).toEqual({ isImmediateCorrection: false });
  });

  it("depois do ensino, toda resposta é correção", () => {
    for (const step of [
      "forwardChoice",
      "forwardInput",
      "reverseChoice"
    ] as const) {
      expect(attemptFlags({ step, taught: true }, "new")).toEqual({
        isImmediateCorrection: true
      });
    }
  });

  it("a correção pedida pela fila é correção", () => {
    expect(
      attemptFlags({ step: "forwardInput", taught: false }, "correction")
    ).toEqual({ isImmediateCorrection: true });
  });
});

describe("markedAsGuess", () => {
  const attempt: ReviewAttempt = {
    id: "a",
    entityId: "per",
    skill: "nameToFlagRecognition",
    exercise: "nameToFlagChoice",
    outcome: "correct",
    isImmediateCorrection: false,
    mode: "scheduled",
    awardedXp: 1,
    responseMs: 1500,
    firstInputMs: 1500,
    createdAt: "2026-09-24T12:00:00.000Z"
  };

  it("marca o chute e tira o XP, sem mexer no resto", () => {
    expect(markedAsGuess(attempt)).toEqual({
      ...attempt,
      guessed: true,
      awardedXp: 0
    });
  });

  it("recusa erro e digitação", () => {
    expect(() => markedAsGuess({ ...attempt, outcome: "incorrect" })).toThrow();
    expect(() =>
      markedAsGuess({
        ...attempt,
        skill: "flagToNameRecall",
        exercise: "flagToNameInput"
      })
    ).toThrow();
  });
});
