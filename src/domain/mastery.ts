import type { SkillKind, SkillState } from "@/types/learning";

export const REQUIRED_MASTERY_SKILLS: readonly SkillKind[] = [
  "flagToNameRecall",
  "nameToFlagRecognition",
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
  states: readonly SkillState[],
): MasteryStatus {
  const bySkill = new Map(
    states
      .filter((state) => state.entityId === entityId)
      .map((state) => [state.skill, state]),
  );
  const missingSkills = REQUIRED_MASTERY_SKILLS.filter(
    (skill) => !bySkill.has(skill),
  );
  if (missingSkills.length > 0) {
    return { mastered: false, missingSkills, reason: "missing-skill" };
  }

  const requiredStates = REQUIRED_MASTERY_SKILLS.map(
    (skill) => bySkill.get(skill)!,
  );
  if (
    requiredStates.some(
      (state) => new Set(state.distinctSuccessDays).size < 2,
    )
  ) {
    return {
      mastered: false,
      missingSkills: [],
      reason: "insufficient-success-days",
    };
  }
  if (
    requiredStates.some(
      (state) =>
        !state.card || state.card.stability < MASTERY_STABILITY_DAYS,
    )
  ) {
    return {
      mastered: false,
      missingSkills: [],
      reason: "insufficient-stability",
    };
  }
  if (requiredStates.some((state) => state.lastOutcome !== "correct")) {
    return {
      mastered: false,
      missingSkills: [],
      reason: "latest-attempt-not-correct",
    };
  }

  return { mastered: true, missingSkills: [], reason: "mastered" };
}

export function isEntityMastered(
  entityId: string,
  states: readonly SkillState[],
): boolean {
  return getMasteryStatus(entityId, states).mastered;
}
