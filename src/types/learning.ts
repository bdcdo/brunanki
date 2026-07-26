import type { Card } from "ts-fsrs";

export type SkillKind = "flagToNameRecall" | "nameToFlagRecognition";
export type AttemptOutcome = "correct" | "partial" | "incorrect" | "skipped";
export type LearningPhase = "unseen" | "acquiring" | "scheduled";

/**
 * Os exercícios que o aplicativo de fato gera.
 *
 * Não existe um exercício de "bandeiras parecidas": a semelhança visual é
 * política de escolha dos distratores (ver domain/distractors.ts), aplicada
 * aos exercícios de alternativa. Um exercício à parte seria um segundo jeito
 * de fazer a mesma coisa.
 */
export type ExerciseKind =
  "diagnostic" | "flagToNameChoice" | "nameToFlagChoice" | "flagToNameInput";

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
  exercise: ExerciseKind;
  outcome: AttemptOutcome;
  /**
   * Verdadeiro quando a tentativa é a repetição imediata que se segue a um
   * erro, e não uma recuperação genuína. O agendador já a desconsiderava para
   * contar dias distintos de sucesso; registrá-la na própria tentativa impede
   * que o histórico guarde uma repetição indistinguível de um acerto de
   * primeira.
   */
  isImmediateCorrection: boolean;
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

/**
 * O que o agendador precisa saber para decidir intervalos.
 *
 * `timeZone` não tem valor padrão: os dias distintos de sucesso são contados
 * em dias de calendário, e não há como dizer "que dia é" sem dizer "dia de
 * quem". Fixar um fuso no código dava a resposta errada a quem estuda fora
 * dele; resolvê-lo a cada chamada reclassificaria o histórico ao viajar.
 */
export interface SchedulingPreferences {
  desiredRetention: number;
  timeZone: string;
}

export type AppSettings = SchedulingPreferences;

/**
 * Tudo o que foi lido do armazenamento local numa leitura.
 *
 * Definição única: antes havia duas interfaces com este nome e formas
 * diferentes — uma em storage/progress.ts, com `settings`, e outra em
 * components/AppProvider.tsx, com `loading` e sem `settings`, que era o
 * motivo de as preferências serem descartadas ao montar o estado da UI.
 */
export interface LearningSnapshot {
  skills: SkillState[];
  attempts: ReviewAttempt[];
  settings: AppSettings;
  diagnostic?: DiagnosticState;
}
