import {
  Rating,
  State,
  createEmptyCard,
  fsrs,
  type Card,
  type Grade,
} from "ts-fsrs";

import type {
  AttemptOutcome,
  ReviewAttempt,
  SkillKind,
  SkillState,
} from "@/types/learning";

export const DEFAULT_DESIRED_RETENTION = 0.9;
export const DEFAULT_TIME_ZONE = "America/Sao_Paulo";

export interface ScheduleAttemptOptions {
  desiredRetention?: number;
  isImmediateCorrection?: boolean;
  timeZone?: string;
}

export function skillStateId(entityId: string, skill: SkillKind): string {
  return `${entityId}::${skill}`;
}

export function createSkillState(
  entityId: string,
  skill: SkillKind,
  now: Date = new Date(),
): SkillState {
  return {
    id: skillStateId(entityId, skill),
    entityId,
    skill,
    phase: "unseen",
    distinctSuccessDays: [],
    updatedAt: now.toISOString(),
  };
}

export function ratingForOutcome(outcome: AttemptOutcome): Grade {
  switch (outcome) {
    case "correct":
      return Rating.Good;
    case "partial":
      return Rating.Hard;
    case "incorrect":
    case "skipped":
      return Rating.Again;
  }
}

export function calendarDay(
  date: Date,
  timeZone: string = DEFAULT_TIME_ZONE,
): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function validateDesiredRetention(value: number): void {
  if (!Number.isFinite(value) || value <= 0 || value > 1) {
    throw new RangeError("desiredRetention deve estar no intervalo (0, 1]");
  }
}

function phaseForCard(card: Card): SkillState["phase"] {
  return card.state === State.Review ? "scheduled" : "acquiring";
}

export function scheduleAttempt(
  currentState: SkillState,
  attempt: ReviewAttempt,
  options: ScheduleAttemptOptions = {},
): SkillState {
  if (
    currentState.entityId !== attempt.entityId ||
    currentState.skill !== attempt.skill
  ) {
    throw new Error("A tentativa não pertence ao estado de habilidade informado");
  }

  const now = new Date(attempt.createdAt);
  if (Number.isNaN(now.getTime())) {
    throw new Error(`Data de tentativa inválida: ${attempt.createdAt}`);
  }

  const desiredRetention =
    options.desiredRetention ?? DEFAULT_DESIRED_RETENTION;
  validateDesiredRetention(desiredRetention);
  const scheduler = fsrs({
    request_retention: desiredRetention,
    enable_fuzz: false,
  });
  const currentCard: Card =
    currentState.card ?? createEmptyCard<Card>(now);
  const { card } = scheduler.next(
    currentCard,
    now,
    ratingForOutcome(attempt.outcome),
  );

  const successDays = new Set(currentState.distinctSuccessDays);
  if (attempt.outcome === "correct" && !options.isImmediateCorrection) {
    successDays.add(calendarDay(now, options.timeZone));
  }

  return {
    ...currentState,
    phase: phaseForCard(card),
    card,
    distinctSuccessDays: [...successDays].sort(),
    lastOutcome: attempt.outcome,
    updatedAt: now.toISOString(),
  };
}
