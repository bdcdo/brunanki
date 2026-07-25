import type { DiagnosticState } from "@/types/learning";

export type RandomSource = () => number;

export function shuffledEntityOrder(
  entityIds: readonly string[],
  random: RandomSource = Math.random,
): string[] {
  if (new Set(entityIds).size !== entityIds.length) {
    throw new Error("O diagnóstico não aceita IDs de entidade duplicados");
  }
  const order = [...entityIds];
  for (let index = order.length - 1; index > 0; index -= 1) {
    const randomValue = random();
    if (randomValue < 0 || randomValue >= 1) {
      throw new RangeError("A fonte aleatória deve retornar valores em [0, 1)");
    }
    const otherIndex = Math.floor(randomValue * (index + 1));
    [order[index], order[otherIndex]] = [order[otherIndex], order[index]];
  }
  return order;
}

export function startDiagnostic(
  entityIds: readonly string[],
  now: Date = new Date(),
  random: RandomSource = Math.random,
): DiagnosticState {
  if (entityIds.length === 0) {
    throw new Error("O diagnóstico exige ao menos uma entidade");
  }
  return {
    entityOrder: shuffledEntityOrder(entityIds, random),
    currentIndex: 0,
    startedAt: now.toISOString(),
  };
}

export function currentDiagnosticEntity(
  state: DiagnosticState,
): string | undefined {
  return state.entityOrder[state.currentIndex];
}

export function advanceDiagnostic(
  state: DiagnosticState,
  now: Date = new Date(),
): DiagnosticState {
  if (state.completedAt) return state;
  const currentIndex = Math.min(
    state.currentIndex + 1,
    state.entityOrder.length,
  );
  return {
    ...state,
    currentIndex,
    ...(currentIndex === state.entityOrder.length
      ? { completedAt: now.toISOString() }
      : {}),
  };
}

export function diagnosticProgress(state: DiagnosticState): {
  answered: number;
  total: number;
  completed: boolean;
} {
  return {
    answered: state.currentIndex,
    total: state.entityOrder.length,
    completed: state.completedAt !== undefined,
  };
}
