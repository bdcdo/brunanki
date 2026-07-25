import type { Card } from "ts-fsrs";

export type SkillKind = "flagToNameRecall" | "nameToFlagRecognition";
export type AttemptOutcome = "correct" | "partial" | "incorrect" | "skipped";
export type LearningPhase = "unseen" | "acquiring" | "scheduled";

export interface SkillState {
  id: string;
  entityId: string;
  skill: SkillKind;
  phase: LearningPhase;
  card?: Card;
  distinctSuccessDays: string[];
  lastOutcome?: AttemptOutcome;
  updatedAt: string;
}

export interface ReviewAttempt {
  id: string;
  entityId: string;
  skill: SkillKind;
  exercise:
    | "diagnostic"
    | "flagToNameChoice"
    | "nameToFlagChoice"
    | "flagToNameInput"
    | "confusablePair"
    | "fluency";
  outcome: AttemptOutcome;
  responseMs: number;
  answer?: string;
  createdAt: string;
}

export interface DiagnosticState {
  entityOrder: string[];
  currentIndex: number;
  startedAt: string;
  completedAt?: string;
}

export interface AppSettings {
  desiredRetention: number;
  reduceMotion: boolean;
}
