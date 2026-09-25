import { Rating } from "ts-fsrs";
import { describe, expect, it } from "vitest";

import type { ExerciseKind, ReviewAttempt } from "@/types/learning";

import {
  DEFAULT_FAST_FIRST_INPUT_MS,
  fastThresholdMs,
  ratingForAttempt
} from "../rating";

let counter = 0;
function attempt(overrides: Partial<ReviewAttempt> = {}): ReviewAttempt {
  counter += 1;
  return {
    id: `t${counter}`,
    entityId: "bra",
    skill: "flagToNameRecall",
    exercise: "flagToNameInput",
    outcome: "correct",
    isImmediateCorrection: false,
    mode: "scheduled",
    awardedXp: 1,
    responseMs: 4000,
    firstInputMs: 1000,
    createdAt: "2026-09-24T12:00:00.000Z",
    ...overrides
  };
}

/** Acertos limpos de primeira com os tempos dados, num tipo de exercício. */
function history(exercise: ExerciseKind, times: readonly number[]) {
  return times.map((firstInputMs) => attempt({ exercise, firstInputMs }));
}

describe("ratingForAttempt", () => {
  const fast = DEFAULT_FAST_FIRST_INPUT_MS.flagToNameInput - 1;
  const slow = DEFAULT_FAST_FIRST_INPUT_MS.flagToNameInput + 1;

  it("acerto rápido de primeira é Easy", () => {
    expect(ratingForAttempt(attempt({ firstInputMs: fast }), [])).toBe(
      Rating.Easy
    );
  });

  it("acerto lento é Good, e nunca Hard", () => {
    expect(ratingForAttempt(attempt({ firstInputMs: slow }), [])).toBe(
      Rating.Good
    );
  });

  it("parcial é Hard mesmo quando é rápido", () => {
    expect(
      ratingForAttempt(attempt({ outcome: "partial", firstInputMs: 10 }), [])
    ).toBe(Rating.Hard);
  });

  it("chute declarado é Hard mesmo quando é rápido", () => {
    expect(
      ratingForAttempt(attempt({ guessed: true, firstInputMs: 10 }), [])
    ).toBe(Rating.Hard);
  });

  it("correção imediata certa é Good, e nunca Easy", () => {
    expect(
      ratingForAttempt(
        attempt({ isImmediateCorrection: true, firstInputMs: 10 }),
        []
      )
    ).toBe(Rating.Good);
  });

  it("erro e pulo são Again", () => {
    expect(ratingForAttempt(attempt({ outcome: "incorrect" }), [])).toBe(
      Rating.Again
    );
    expect(ratingForAttempt(attempt({ outcome: "skipped" }), [])).toBe(
      Rating.Again
    );
  });

  it("sem tempo de primeira entrada, o acerto fica Good", () => {
    const semTempo: ReviewAttempt = attempt();
    delete semTempo.firstInputMs;
    expect(ratingForAttempt(semTempo, [])).toBe(Rating.Good);
  });
});

describe("fastThresholdMs", () => {
  it("usa o limiar fixo com nove amostras, e o pessoal a partir de dez", () => {
    // Números literais, e não a constante: com ela, mudar o mínimo mudaria o
    // teste junto, e a regra não teria quem a fixasse.
    const nove = history("flagToNameInput", Array(9).fill(100));
    expect(fastThresholdMs("flagToNameInput", nove)).toBe(
      DEFAULT_FAST_FIRST_INPUT_MS.flagToNameInput
    );
    const dez = history("flagToNameInput", Array(10).fill(100));
    expect(fastThresholdMs("flagToNameInput", dez)).toBe(100);
  });

  it("com dez ou mais, usa o quartil mais rápido da própria pessoa", () => {
    // Doze acertos de 1 a 12 segundos: o quartil mais rápido termina em 3 s.
    const doze = history(
      "flagToNameInput",
      Array.from({ length: 12 }, (_, index) => (index + 1) * 1000)
    );
    expect(fastThresholdMs("flagToNameInput", doze)).toBe(3000);
    // Com esse histórico, 3,5 s deixa de ser rápido, embora fosse pelo fixo.
    expect(ratingForAttempt(attempt({ firstInputMs: 3500 }), doze)).toBe(
      Rating.Good
    );
    expect(ratingForAttempt(attempt({ firstInputMs: 2000 }), doze)).toBe(
      Rating.Easy
    );
  });

  it("calcula por tipo de exercício, sem misturar amostras", () => {
    // Doze escolhas lentas não mexem no limiar da digitação.
    const escolhas = history(
      "nameToFlagChoice",
      Array.from({ length: 12 }, () => 9000)
    );
    expect(fastThresholdMs("flagToNameInput", escolhas)).toBe(
      DEFAULT_FAST_FIRST_INPUT_MS.flagToNameInput
    );
    expect(fastThresholdMs("nameToFlagChoice", escolhas)).toBe(9000);
  });

  it("ignora chute, correção e erro ao montar a amostra", () => {
    const sujas = [
      ...Array.from({ length: 12 }, () =>
        attempt({ guessed: true, firstInputMs: 50 })
      ),
      ...Array.from({ length: 12 }, () =>
        attempt({ isImmediateCorrection: true, firstInputMs: 50 })
      ),
      ...Array.from({ length: 12 }, () =>
        attempt({ outcome: "incorrect", firstInputMs: 50 })
      )
    ];
    expect(fastThresholdMs("flagToNameInput", sujas)).toBe(
      DEFAULT_FAST_FIRST_INPUT_MS.flagToNameInput
    );
  });
});
