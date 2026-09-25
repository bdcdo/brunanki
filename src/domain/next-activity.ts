import type { SkillKind, SkillState } from "@/types/learning";

import { skillStateId } from "./scheduler";

/**
 * Por que uma atividade foi escolhida: vencida, correção (um erro que o FSRS
 * reagendou para os próximos minutos) ou nova.
 */
export type ActivityReason = "due" | "correction" | "new";

export interface NextActivity {
  readonly entityId: string;
  readonly skill: SkillKind;
  readonly reason: ActivityReason;
}

/**
 * Até onde um erro reagendado conta como correção e passa na frente da
 * próxima novidade, mesmo antes de vencer. Dez minutos cobrem os passos de
 * aprendizagem do FSRS depois de um erro.
 *
 * Vale só para erro. Um acerto de bandeira nova também cai num passo de dez
 * minutos, e puxá-lo antes de vencer faria cada acerto trazer a mesma
 * bandeira de volta na tela seguinte, desperdiçando o espaçamento. O acerto
 * volta quando vence, e aí entra como revisão vencida, na frente das
 * novidades.
 */
export const SHORT_REVIEW_WINDOW_MS = 10 * 60 * 1000;

export interface NextActivityOptions {
  readonly states: readonly SkillState[];
  /** Ordem das novidades: só as do continente ativo, na ordem do currículo. */
  readonly entityOrder: readonly string[];
  readonly now?: Date;
  /**
   * A atividade que acabou de ser respondida. Ela não volta como a próxima se
   * houver outra revisão a intercalar: repetir a mesma bandeira na tela
   * seguinte mede a memória de trabalho, e não a recuperação. Se a única
   * outra coisa for uma novidade, a correção vem mesmo assim, porque ela
   * passa na frente da novidade seguinte.
   */
  readonly justAnswered?: {
    readonly entityId: string;
    readonly skill: SkillKind;
  };
}

function dueTime(state: SkillState): number {
  return new Date(state.card!.due).getTime();
}

/**
 * A próxima coisa a estudar, recalculada depois de cada resposta.
 *
 * Não há teto de sessão, limite de novidades nem freio por acurácia: a
 * prioridade sozinha decide. Primeiro o que venceu, do mais antigo para o
 * mais novo; depois as correções; por último a próxima bandeira nova da
 * ordem. Revisões são de qualquer
 * continente, porque vêm dos estados guardados; novidades, só da ordem
 * recebida. Devolve `undefined` quando não há nada.
 */
export function nextActivity(
  options: NextActivityOptions
): NextActivity | undefined {
  const now = (options.now ?? new Date()).getTime();
  const justAnsweredId = options.justAnswered
    ? skillStateId(options.justAnswered.entityId, options.justAnswered.skill)
    : undefined;

  const scheduled = options.states.filter((state) => state.card !== undefined);
  const due = scheduled
    .filter((state) => dueTime(state) <= now)
    .sort(
      (left, right) =>
        dueTime(left) - dueTime(right) || left.id.localeCompare(right.id)
    );
  const corrections = scheduled
    .filter((state) => {
      const time = dueTime(state);
      return (
        state.lastOutcome !== undefined &&
        state.lastOutcome !== "correct" &&
        time > now &&
        time <= now + SHORT_REVIEW_WINDOW_MS
      );
    })
    .sort(
      (left, right) =>
        dueTime(left) - dueTime(right) || left.id.localeCompare(right.id)
    );

  const stateById = new Map(options.states.map((state) => [state.id, state]));
  let fresh: NextActivity | undefined;
  for (const entityId of options.entityOrder) {
    const recall = stateById.get(skillStateId(entityId, "flagToNameRecall"));
    const recognition = stateById.get(
      skillStateId(entityId, "nameToFlagRecognition")
    );
    if (!recall || recall.phase === "unseen") {
      fresh = { entityId, skill: "flagToNameRecall", reason: "new" };
      break;
    }
    if (!recognition || recognition.phase === "unseen") {
      fresh = { entityId, skill: "nameToFlagRecognition", reason: "new" };
      break;
    }
  }

  const reviews: NextActivity[] = [
    ...due.map(({ entityId, skill }) => ({
      entityId,
      skill,
      reason: "due" as const
    })),
    ...corrections.map(({ entityId, skill }) => ({
      entityId,
      skill,
      reason: "correction" as const
    }))
  ];
  const interleaved = reviews.find(
    ({ entityId, skill }) => skillStateId(entityId, skill) !== justAnsweredId
  );
  return interleaved ?? reviews[0] ?? fresh;
}

/** Quantas revisões estão vencidas agora, de qualquer continente. */
export function dueCount(
  states: readonly SkillState[],
  now: Date = new Date()
): number {
  return states.filter(
    (state) => state.card !== undefined && dueTime(state) <= now.getTime()
  ).length;
}
