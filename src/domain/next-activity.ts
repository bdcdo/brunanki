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
 * Por quanto tempo depois de respondida uma habilidade conta como recente.
 *
 * Um erro recente é correção: passa na frente da próxima novidade e é gravado
 * como correção imediata, qualquer que seja o vencimento do cartão. A regra
 * olha o tempo desde a resposta, e não o vencimento, porque o FSRS reagenda
 * um erro em cartão novo para daqui a um minuto: quem levasse mais do que
 * isso para chegar à correção a veria como revisão vencida, e um acerto dela
 * contaria dia de sucesso e XP como se fosse lembrança genuína.
 *
 * Um acerto recente não é puxado antes de vencer. Um acerto de bandeira nova
 * também cai num passo de dez minutos, e puxá-lo cedo traria a mesma bandeira
 * de volta na tela seguinte, desperdiçando o espaçamento.
 */
export const SHORT_REVIEW_WINDOW_MS = 10 * 60 * 1000;

export interface NextActivityOptions {
  readonly states: readonly SkillState[];
  /** Ordem das novidades: só as do continente ativo, na ordem do currículo. */
  readonly entityOrder: readonly string[];
  readonly now?: Date;
  /**
   * A atividade que acabou de ser respondida. A mesma bandeira não volta na
   * tela seguinte, em nenhuma das duas direções, se houver outra coisa a
   * fazer: repeti-la mediria a memória de trabalho, e não a recuperação. A
   * exceção é a correção do erro que acabou de acontecer, que vem antes da
   * novidade seguinte, uma vez; se a própria correção errar de novo, a
   * novidade passa, e a correção volta depois dela.
   */
  readonly justAnswered?: NextActivity;
}

function dueTime(state: SkillState): number {
  return new Date(state.card!.due).getTime();
}

/**
 * `updatedAt` é gravado junto com cada resposta que move o estado, e só com
 * ela; a escolha que não agenda grava o estado sem alterá-lo.
 */
function answeredWithin(state: SkillState, now: number): boolean {
  return now - new Date(state.updatedAt).getTime() <= SHORT_REVIEW_WINDOW_MS;
}

function isRecentError(state: SkillState, now: number): boolean {
  return (
    state.card !== undefined &&
    state.lastOutcome !== undefined &&
    state.lastOutcome !== "correct" &&
    answeredWithin(state, now)
  );
}

function byDue(left: SkillState, right: SkillState): number {
  return dueTime(left) - dueTime(right) || left.id.localeCompare(right.id);
}

/**
 * A próxima coisa a estudar, recalculada depois de cada resposta.
 *
 * Não há teto de sessão, limite de novidades nem freio por acurácia: a
 * prioridade sozinha decide. Primeiro o que venceu, do mais antigo para o
 * mais novo; depois as correções; por último a próxima bandeira nova da
 * ordem. Revisões são de qualquer continente, porque vêm dos estados
 * guardados; novidades, só da ordem recebida. Devolve `undefined` quando não
 * há nada.
 */
export function nextActivity(
  options: NextActivityOptions
): NextActivity | undefined {
  const now = (options.now ?? new Date()).getTime();
  const scheduled = options.states.filter((state) => state.card !== undefined);
  const corrections = scheduled
    .filter((state) => isRecentError(state, now))
    .sort(byDue);
  const due = scheduled
    .filter((state) => dueTime(state) <= now && !isRecentError(state, now))
    .sort(byDue);

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
      // A outra direção de uma bandeira que acabou de ser respondida seria a
      // mesma bandeira de novo; ela espera a janela passar, e a ordem segue.
      if (answeredWithin(recall, now)) continue;
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
  const last = options.justAnswered;
  const interleaved = reviews.find(
    ({ entityId }) => entityId !== last?.entityId
  );
  if (interleaved) return interleaved;

  // Sobrou só a bandeira que acabou de ser respondida.
  const correctionOfLast =
    last && last.reason !== "correction"
      ? reviews.find(
          ({ skill, reason }) => reason === "correction" && skill === last.skill
        )
      : undefined;
  return correctionOfLast ?? fresh ?? reviews[0];
}

/**
 * Quantas revisões estão vencidas agora, de qualquer continente. Um erro
 * recente que já venceu não entra: a fila o trata como correção.
 */
export function dueCount(
  states: readonly SkillState[],
  now: Date = new Date()
): number {
  const time = now.getTime();
  return states.filter(
    (state) =>
      state.card !== undefined &&
      dueTime(state) <= time &&
      !isRecentError(state, time)
  ).length;
}
