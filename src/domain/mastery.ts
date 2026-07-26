import type { ReviewAttempt, SkillKind, SkillState } from "@/types/learning";

export const REQUIRED_MASTERY_SKILLS: readonly SkillKind[] = [
  "flagToNameRecall",
  "nameToFlagRecognition"
];
export const MASTERY_STABILITY_DAYS = 30;

export interface MasteryStatus {
  mastered: boolean;
  missingSkills: SkillKind[];
  reason:
    | "mastered"
    | "missing-skill"
    | "insufficient-success-days"
    | "insufficient-stability"
    | "latest-attempt-not-correct";
}

export function getMasteryStatus(
  entityId: string,
  states: readonly SkillState[]
): MasteryStatus {
  const bySkill = new Map(
    states
      .filter((state) => state.entityId === entityId)
      .map((state) => [state.skill, state])
  );
  const missingSkills = REQUIRED_MASTERY_SKILLS.filter(
    (skill) => !bySkill.has(skill)
  );
  if (missingSkills.length > 0) {
    return { mastered: false, missingSkills, reason: "missing-skill" };
  }

  const requiredStates = REQUIRED_MASTERY_SKILLS.map((skill) =>
    bySkill.get(skill)!
  );
  if (
    requiredStates.some((state) => new Set(state.distinctSuccessDays).size < 2)
  ) {
    return {
      mastered: false,
      missingSkills: [],
      reason: "insufficient-success-days"
    };
  }
  if (
    requiredStates.some(
      (state) => !state.card || state.card.stability < MASTERY_STABILITY_DAYS
    )
  ) {
    return {
      mastered: false,
      missingSkills: [],
      reason: "insufficient-stability"
    };
  }
  if (requiredStates.some((state) => state.lastOutcome !== "correct")) {
    return {
      mastered: false,
      missingSkills: [],
      reason: "latest-attempt-not-correct"
    };
  }

  return { mastered: true, missingSkills: [], reason: "mastered" };
}

export function isEntityMastered(
  entityId: string,
  states: readonly SkillState[]
): boolean {
  return getMasteryStatus(entityId, states).mastered;
}

/**
 * O estágio de uma entidade — exclusivo por construção.
 *
 * A tela de progresso classificava cada estágio com um filtro independente,
 * de modo que uma entidade com uma habilidade em aquisição e outra em revisão
 * era contada duas vezes. Uma função que devolve um único estágio torna essa
 * dupla contagem impossível de escrever.
 */
export type EntityStage = "unseen" | "acquiring" | "reviewing" | "mastered";

export function entityStage(
  entityId: string,
  states: readonly SkillState[]
): EntityStage {
  const own = states.filter((state) => state.entityId === entityId);
  if (own.length === 0 || own.every((state) => state.phase === "unseen")) {
    return "unseen";
  }
  if (isEntityMastered(entityId, own)) return "mastered";
  // Aquisição vence revisão: enquanto qualquer direção ainda precisar de
  // apoio, a entidade como um todo ainda está sendo aprendida.
  if (own.some((state) => state.phase === "acquiring")) return "acquiring";
  return "reviewing";
}

export interface ProgressSummary {
  readonly total: number;
  readonly byStage: Readonly<Record<EntityStage, number>>;
  readonly firstTryCorrect: number;
}

export function summarizeProgress(
  entityIds: readonly string[],
  states: readonly SkillState[],
  attempts: readonly ReviewAttempt[]
): ProgressSummary {
  const byStage: Record<EntityStage, number> = {
    unseen: 0,
    acquiring: 0,
    reviewing: 0,
    mastered: 0
  };
  for (const entityId of entityIds) {
    byStage[entityStage(entityId, states)] += 1;
  }

  return {
    total: entityIds.length,
    byStage,
    // Repetição imediata depois de um erro não é acerto de primeira: o
    // agendador já a desconsiderava para retenção, e o rótulo da tela
    // prometia justamente a contagem sem ela.
    firstTryCorrect: attempts.filter(
      (attempt) =>
        attempt.outcome === "correct" && !attempt.isImmediateCorrection
    ).length
  };
}
