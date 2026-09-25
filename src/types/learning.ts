import type { Card } from "ts-fsrs";

import type { ContinentId } from "@/types/geography";

export type SkillKind = "flagToNameRecall" | "nameToFlagRecognition";
export type AttemptOutcome = "correct" | "partial" | "incorrect" | "skipped";
export type LearningPhase = "unseen" | "acquiring" | "scheduled";

/**
 * Os exercícios que o aplicativo de fato gera.
 *
 * Falta aqui o contraste entre bandeiras parecidas. Este comentário registrava
 * a recusa dele, com o argumento de que a semelhança visual já é política de
 * escolha dos distratores (ver domain/distractors.ts) e de que um exercício à
 * parte seria um segundo jeito de fazer a mesma coisa.
 *
 * Esse argumento foi revertido pela ADR-0006: acertar entre quatro opções
 * é evidência de recuperação; distinguir um par é evidência de discriminação,
 * e é essa segunda que o critério de domínio precisa consumir. Some-se que a
 * confundibilidade calculada não enxerga tom nem disposição — ela empata Chade
 * e Romênia sem ter como distingui-los —, de modo que os pares que importam
 * precisam ser curados, não inferidos.
 *
 * `contrastChoice` entra quando o currículo editorial existir; até lá, a
 * ausência é lacuna conhecida, não decisão.
 */
export type ExerciseKind =
  "flagToNameChoice" | "nameToFlagChoice" | "flagToNameInput";

/**
 * Agendada é a tentativa que a fila pediu. Quase todas movem o FSRS; a
 * exceção é a escolha logo depois da apresentação de uma bandeira nova, que
 * faz parte da sessão agendada mas não é recuperação. Livre é a prática sem
 * trabalho vencido: dá feedback e XP, mas não pode virar evidência de
 * domínio, e a marca na própria tentativa é o que impede o histórico de
 * guardar uma sem distinguir da outra.
 */
export type AttemptMode = "scheduled" | "free";

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
  mode: AttemptMode;
  responseMs: number;
  /**
   * Milissegundos até a primeira tecla, na digitação, ou até o clique, na
   * escolha. Mede reconhecimento sem medir digitação: o tempo total pune nome
   * longo e teclado de celular, e por isso é este campo, e não `responseMs`,
   * que a nota por velocidade vai ler. Na digitação ele ainda não é medido.
   */
  firstInputMs?: number;
  /** Marcada por quem respondeu, depois de um acerto em escolha. */
  guessed?: boolean;
  /** 1 só para acerto integral de primeira; a regra é `awardedXpFor`. */
  awardedXp: 0 | 1;
  answer?: string;
  createdAt: string;
}

/**
 * Discriminação de um par de bandeiras confundíveis, com cartão FSRS próprio.
 *
 * O par não pertence a nenhuma das duas entidades, e por isso não cabe em
 * `SkillState`: o ID é a chave canônica do par (ver `pairStateId`), igual
 * qualquer que seja a ordem em que as duas bandeiras aparecem.
 */
export interface PairState {
  id: string;
  entityIds: readonly [string, string];
  card?: Card;
  distinctSuccessDays: string[];
  lastOutcome?: AttemptOutcome;
  updatedAt: string;
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

/**
 * Preferências de agendamento mais o continente em estudo. O continente
 * governa só a introdução de bandeiras novas e o conjunto das alternativas:
 * revisão vencida de outro continente continua aparecendo.
 */
export interface AppSettings extends SchedulingPreferences {
  activeContinent: ContinentId;
}

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
  pairs: PairState[];
  settings: AppSettings;
}
