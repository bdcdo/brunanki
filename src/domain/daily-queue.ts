import type { ReviewAttempt, SkillKind, SkillState } from "@/types/learning";

import { skillStateId } from "./scheduler";

export type QueueReason = "due" | "correction" | "new";

export interface DailyQueueItem {
  entityId: string;
  skill: SkillKind;
  reason: QueueReason;
}

export interface DailyQueueOptions {
  entityOrder: readonly string[];
  states: readonly SkillState[];
  recentAttempts?: readonly ReviewAttempt[];
  now?: Date;
  baseNewLimit?: number;
  recentAttemptWindow?: number;
}

export interface DailyQueue {
  items: DailyQueueItem[];
  dueCount: number;
  correctionCount: number;
  newLimit: number;
  recentAccuracy: number | null;
}

const SKILL_ORDER: readonly SkillKind[] = [
  "flagToNameRecall",
  "nameToFlagRecognition"
];

function recentAccuracy(
  attempts: readonly ReviewAttempt[],
  window: number
): number | null {
  const relevant = attempts
    .filter((attempt) => attempt.exercise !== "diagnostic")
    .slice()
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, window);
  if (relevant.length === 0) return null;
  return (
    relevant.filter((attempt) => attempt.outcome === "correct").length /
    relevant.length
  );
}

function calculateNewLimit(
  baseNewLimit: number,
  dueCount: number,
  accuracy: number | null
): number {
  if (dueCount >= baseNewLimit * 2 || (accuracy !== null && accuracy < 0.6)) {
    return 0;
  }
  if (dueCount >= baseNewLimit || (accuracy !== null && accuracy < 0.8)) {
    return Math.ceil(baseNewLimit / 2);
  }
  return baseNewLimit;
}

export function buildDailyQueue(options: DailyQueueOptions): DailyQueue {
  const now = options.now ?? new Date();
  const baseNewLimit = options.baseNewLimit ?? 10;
  const recentAttemptWindow = options.recentAttemptWindow ?? 20;
  if (!Number.isInteger(baseNewLimit) || baseNewLimit < 0) {
    throw new RangeError("baseNewLimit deve ser um inteiro não negativo");
  }
  if (!Number.isInteger(recentAttemptWindow) || recentAttemptWindow <= 0) {
    throw new RangeError("recentAttemptWindow deve ser um inteiro positivo");
  }

  const stateById = new Map(options.states.map((state) => [state.id, state]));
  const dueStates = options.states
    .filter(
      (state) =>
        state.card !== undefined &&
        new Date(state.card.due).getTime() <= now.getTime()
    )
    .sort(
      (left, right) =>
        new Date(left.card!.due).getTime() -
          new Date(right.card!.due).getTime() || left.id.localeCompare(right.id)
    );
  const queuedIds = new Set(dueStates.map(({ id }) => id));
  const corrections = options.states
    .filter(
      (state) =>
        !queuedIds.has(state.id) &&
        state.phase !== "unseen" &&
        state.lastOutcome !== undefined &&
        state.lastOutcome !== "correct"
    )
    .sort((left, right) => left.updatedAt.localeCompare(right.updatedAt));

  for (const state of corrections) queuedIds.add(state.id);

  const accuracy = recentAccuracy(
    options.recentAttempts ?? [],
    recentAttemptWindow
  );
  const newLimit = calculateNewLimit(baseNewLimit, dueStates.length, accuracy);
  const newItems: DailyQueueItem[] = [];

  for (const entityId of options.entityOrder) {
    if (newItems.length >= newLimit) break;
    const recall = stateById.get(skillStateId(entityId, "flagToNameRecall"));
    const recognition = stateById.get(
      skillStateId(entityId, "nameToFlagRecognition")
    );

    let skill: SkillKind | undefined;
    if (!recall || recall.phase === "unseen") {
      skill = "flagToNameRecall";
    } else if (!recognition || recognition.phase === "unseen") {
      skill = "nameToFlagRecognition";
    }

    if (skill) {
      const id = skillStateId(entityId, skill);
      if (!queuedIds.has(id)) {
        queuedIds.add(id);
        newItems.push({ entityId, skill, reason: "new" });
      }
    }
  }

  return {
    items: [
      ...dueStates.map(({ entityId, skill }) => ({
        entityId,
        skill,
        reason: "due" as const
      })),
      ...corrections.map(({ entityId, skill }) => ({
        entityId,
        skill,
        reason: "correction" as const
      })),
      ...newItems
    ],
    dueCount: dueStates.length,
    correctionCount: corrections.length,
    newLimit,
    recentAccuracy: accuracy
  };
}

export function skillsInLearningOrder(): readonly SkillKind[] {
  return SKILL_ORDER;
}
