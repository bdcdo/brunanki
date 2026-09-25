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

/** Acertos limpos de primeira com os tempos dados, num tipo de exercício,
 *  todos anteriores à tentativa padrão. */
function history(exercise: ExerciseKind, times: readonly number[]) {
  return times.map((firstInputMs) =>
    attempt({ exercise, firstInputMs, createdAt: "2026-09-20T12:00:00.000Z" })
  );
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

  it("na primeira revisão do cartão, só a digitação promove", () => {
    const first = { firstReview: true };
    expect(ratingForAttempt(attempt({ firstInputMs: 10 }), [], first)).toBe(
      Rating.Easy
    );
    const escolha = attempt({
      skill: "nameToFlagRecognition",
      exercise: "nameToFlagChoice",
      firstInputMs: 10
    });
    expect(ratingForAttempt(escolha, [], first)).toBe(Rating.Good);
    // Depois da primeira revisão, a escolha rápida promove.
    expect(ratingForAttempt(escolha, [])).toBe(Rating.Easy);
  });

  it("o limiar pessoal só usa o que veio antes da tentativa", () => {
    // Dez amostras de 100 ms, mas no mesmo instante da tentativa ou depois
    // dela: nenhuma entra, e vale o limiar fixo.
    const tempo = DEFAULT_FAST_FIRST_INPUT_MS.flagToNameInput - 1;
    const atual = attempt({ firstInputMs: tempo });
    const simultaneas = Array.from({ length: 10 }, () =>
      attempt({ firstInputMs: 100, createdAt: atual.createdAt })
    );
    const posteriores = Array.from({ length: 10 }, () =>
      attempt({ firstInputMs: 100, createdAt: "2026-09-25T12:00:00.000Z" })
    );
    expect(ratingForAttempt(atual, [...simultaneas, atual])).toBe(Rating.Easy);
    expect(ratingForAttempt(atual, posteriores)).toBe(Rating.Easy);
    // As mesmas dez, anteriores, fixam o limiar em 100 ms.
    expect(
      ratingForAttempt(atual, history("flagToNameInput", Array(10).fill(100)))
    ).toBe(Rating.Good);
  });

  it("acerto exatamente no limiar é rápido", () => {
    const limiar = DEFAULT_FAST_FIRST_INPUT_MS.flagToNameInput;
    expect(ratingForAttempt(attempt({ firstInputMs: limiar }), [])).toBe(
      Rating.Easy
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

  it("toma o quartil pela posição, com amostras distintas e fora de ordem", () => {
    // Dez tempos distintos, de 1 a 10 s, embaralhados: o quartil mais rápido
    // é a terceira posição, 3 s.
    const tempos = [7, 2, 9, 1, 10, 4, 3, 8, 6, 5].map((s) => s * 1000);
    expect(
      fastThresholdMs("flagToNameInput", history("flagToNameInput", tempos))
    ).toBe(3000);
  });

  it("não conta como amostra acerto sem tempo medido", () => {
    // Nove com tempo e três sem, como as tentativas de backups antigos: ainda
    // faltam amostras, e vale o limiar fixo.
    const semTempo = Array.from({ length: 3 }, () => {
      const antiga = attempt({ createdAt: "2026-09-20T12:00:00.000Z" });
      delete antiga.firstInputMs;
      return antiga;
    });
    expect(
      fastThresholdMs("flagToNameInput", [
        ...history("flagToNameInput", Array(9).fill(100)),
        ...semTempo
      ])
    ).toBe(DEFAULT_FAST_FIRST_INPUT_MS.flagToNameInput);
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
