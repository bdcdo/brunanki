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
const preferences: SchedulingPreferences = {
  desiredRetention: 0.9,
  timeZone: "America/Sao_Paulo"
};

/**
 * Um estado agendado. `answeredAt` padrão é de uma hora antes, fora da janela
 * curta: só o teste que quer uma resposta recente a declara.
 */
function scheduled(
  entityId: string,
  skill: SkillKind,
  due: Date,
  lastOutcome: AttemptOutcome = "correct",
  answeredAt: Date = minutes(-60)
): SkillState {
  return {
    id: skillStateId(entityId, skill),
    entityId,
    skill,
    phase: "scheduled",
    card: createEmptyCard<Card>(due),
    distinctSuccessDays: [],
    lastOutcome,
    updatedAt: answeredAt.toISOString()
  };
}

/** Um erro de verdade, agendado pelo FSRS em `at`. */
function wrongAt(entityId: string, at: Date): SkillState {
  return scheduleAttempt(
    createSkillState(entityId, "flagToNameRecall", at),
    {
      id: `erro-${entityId}`,
      entityId,
      skill: "flagToNameRecall",
      exercise: "flagToNameInput",
      outcome: "incorrect",
      isImmediateCorrection: false,
      mode: "scheduled",
      awardedXp: 0,
      responseMs: 3000,
      createdAt: at.toISOString()
    },
    preferences
  );
}

describe("nextActivity", () => {
  it("põe vencida antes de correção, e correção antes de novidade", () => {
    const states = [
      scheduled("chl", "flagToNameRecall", minutes(1), "incorrect", now),
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

  it("um erro recente continua sendo correção depois de vencer", () => {
    // O FSRS reagenda o erro de um cartão novo para daqui a um minuto. Aos
    // setenta segundos ele já venceu, e ainda é a correção do que a pessoa
    // errou, e não uma lembrança genuína.
    const states = [
      wrongAt("usa", now),
      scheduled("arg", "flagToNameRecall", minutes(-5))
    ];
    expect(
      nextActivity({
        states,
        entityOrder: [],
        now: new Date(now.getTime() + 70_000),
        justAnswered: {
          entityId: "arg",
          skill: "flagToNameRecall",
          reason: "due"
        }
      })
    ).toEqual({
      entityId: "usa",
      skill: "flagToNameRecall",
      reason: "correction"
    });
  });

  it("um erro fora da janela deixa de ser correção", () => {
    const antigo = scheduled(
      "chl",
      "flagToNameRecall",
      minutes(5),
      "incorrect",
      minutes(-11)
    );
    // Não venceu: espera a vez, e a novidade passa.
    expect(
      nextActivity({ states: [antigo], entityOrder: ["bra"], now })
    ).toMatchObject({ entityId: "bra", reason: "new" });
    // Venceu: volta como revisão.
    const vencido = { ...antigo, card: createEmptyCard<Card>(minutes(-1)) };
    expect(
      nextActivity({ states: [vencido], entityOrder: ["bra"], now })
    ).toMatchObject({ entityId: "chl", reason: "due" });
  });

  it.each(["partial", "skipped"] as const)(
    "resposta %s recente também é correção",
    (outcome) => {
      const states = [
        scheduled("chl", "flagToNameRecall", minutes(6), outcome, now)
      ];
      expect(nextActivity({ states, entityOrder: ["bra"], now })).toMatchObject(
        { entityId: "chl", reason: "correction" }
      );
    }
  );

  it("vencidas vão da mais antiga à mais nova, e correções também", () => {
    const vencidas = [
      scheduled("arg", "flagToNameRecall", minutes(-1)),
      scheduled("chl", "flagToNameRecall", minutes(-30))
    ];
    expect(
      nextActivity({ states: vencidas, entityOrder: [], now })
    ).toMatchObject({ entityId: "chl", reason: "due" });

    const correcoes = [
      scheduled("arg", "flagToNameRecall", minutes(8), "incorrect", now),
      scheduled("chl", "flagToNameRecall", minutes(1), "incorrect", now)
    ];
    expect(
      nextActivity({ states: correcoes, entityOrder: [], now })
    ).toMatchObject({ entityId: "chl", reason: "correction" });
  });

  it("vence no instante exato do vencimento", () => {
    const states = [scheduled("arg", "flagToNameRecall", now)];
    expect(nextActivity({ states, entityOrder: [], now })).toMatchObject({
      entityId: "arg",
      reason: "due"
    });
  });

  it("um estado gravado como não visto ainda é novidade", () => {
    // A escolha que segue a apresentação grava o estado sem agendá-lo.
    const states = [createSkillState("bra", "flagToNameRecall", now)];
    expect(nextActivity({ states, entityOrder: ["bra"], now })).toEqual({
      entityId: "bra",
      skill: "flagToNameRecall",
      reason: "new"
    });
  });

  it("não puxa antes da hora o acerto que o FSRS marcou para daqui a dez minutos", () => {
    const states = [
      scheduled("bra", "flagToNameRecall", minutes(10), "correct", now)
    ];
    // Nem a recordação, que vence daqui a dez minutos, nem o reconhecimento
    // do próprio Brasil, que seria a mesma bandeira na tela seguinte: a
    // próxima é a novidade seguinte da ordem.
    expect(nextActivity({ states, entityOrder: ["bra", "arg"], now })).toEqual({
      entityId: "arg",
      skill: "flagToNameRecall",
      reason: "new"
    });
  });

  it("a outra direção de uma bandeira entra quando a janela passa", () => {
    const states = [
      scheduled("bra", "flagToNameRecall", minutes(60 * 24), "correct")
    ];
    expect(nextActivity({ states, entityOrder: ["bra", "arg"], now })).toEqual({
      entityId: "bra",
      skill: "nameToFlagRecognition",
      reason: "new"
    });
  });

  it("não repete a bandeira recém-respondida, em nenhuma direção, se houver outra revisão", () => {
    const states = [
      scheduled("chl", "nameToFlagRecognition", minutes(-10)),
      scheduled("arg", "flagToNameRecall", minutes(-1))
    ];
    expect(
      nextActivity({
        states,
        entityOrder: [],
        now,
        justAnswered: {
          entityId: "chl",
          skill: "flagToNameRecall",
          reason: "due"
        }
      })
    ).toMatchObject({ entityId: "arg", reason: "due" });
  });

  it("sem outra revisão, a outra direção da mesma bandeira cede à novidade", () => {
    const states = [scheduled("chl", "nameToFlagRecognition", minutes(-10))];
    expect(
      nextActivity({
        states,
        entityOrder: ["bra"],
        now,
        justAnswered: {
          entityId: "chl",
          skill: "flagToNameRecall",
          reason: "due"
        }
      })
    ).toMatchObject({ entityId: "bra", reason: "new" });
  });

  it("reinsere o erro antes da novidade seguinte, mesmo sem outra revisão", () => {
    expect(
      nextActivity({
        states: [wrongAt("usa", now)],
        entityOrder: ["usa", "can"],
        now: new Date(now.getTime() + 5_000),
        justAnswered: {
          entityId: "usa",
          skill: "flagToNameRecall",
          reason: "new"
        }
      })
    ).toMatchObject({ entityId: "usa", reason: "correction" });
  });

  it("a correção que erra de novo cede a vez à novidade antes de voltar", () => {
    const errado = wrongAt("usa", now);
    const depois = new Date(now.getTime() + 5_000);
    const correcao = {
      entityId: "usa",
      skill: "flagToNameRecall",
      reason: "correction"
    } as const;
    expect(
      nextActivity({
        states: [errado],
        entityOrder: ["usa", "can"],
        now: depois,
        justAnswered: correcao
      })
    ).toMatchObject({ entityId: "can", reason: "new" });
    // Sem novidade, a correção volta: é melhor do que terminar a sessão com
    // um erro de minutos atrás.
    expect(
      nextActivity({
        states: [errado],
        entityOrder: ["usa"],
        now: depois,
        justAnswered: correcao
      })
    ).toMatchObject({ entityId: "usa", reason: "correction" });
  });

  it("a exceção da correção vale só para a habilidade que errou", () => {
    // A recordação do Chile acabou de ser respondida, e o reconhecimento dele
    // tem um erro recente. Ele seria a mesma bandeira na tela seguinte, e não
    // a correção do que acabou de acontecer: a novidade passa na frente.
    const states = [
      scheduled("chl", "nameToFlagRecognition", minutes(3), "incorrect", now)
    ];
    expect(
      nextActivity({
        states,
        entityOrder: ["bra"],
        now,
        justAnswered: {
          entityId: "chl",
          skill: "flagToNameRecall",
          reason: "due"
        }
      })
    ).toMatchObject({ entityId: "bra", reason: "new" });
  });

  it("introduz as 35 bandeiras das Américas sem teto", () => {
    // Acerta cada novidade de primeira, com o relógio parado: nenhuma revisão
    // vence no caminho, e o que decide é só a ordem, sem limite de sessão.
    const order = introductionOrder("americas");
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
  it("conta o que já venceu, inclusive no instante exato", () => {
    expect(
      dueCount(
        [
          scheduled("bra", "flagToNameRecall", minutes(-1)),
          scheduled("chl", "flagToNameRecall", now),
          scheduled("arg", "flagToNameRecall", minutes(1))
        ],
        now
      )
    ).toBe(2);
  });

  it("não conta o erro recente que já venceu, que a fila trata como correção", () => {
    const states = [wrongAt("usa", now)];
    expect(dueCount(states, new Date(now.getTime() + 70_000))).toBe(0);
  });
});
