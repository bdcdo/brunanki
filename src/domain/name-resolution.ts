import type { LearningEntity } from "@/types/catalog";

export type NameResolution =
  | { kind: "empty" }
  | { kind: "exact"; entityId: string }
  | { kind: "partial"; entityId: string; distance: number }
  | { kind: "incorrect"; matchedEntityId?: string };

interface IndexedName {
  entityId: string;
  value: string;
}

export function normalizeCountryName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function damerauLevenshteinDistance(left: string, right: string): number {
  const source = Array.from(left);
  const target = Array.from(right);
  const matrix = Array.from({ length: source.length + 1 }, () =>
    Array<number>(target.length + 1).fill(0),
  );

  for (let row = 0; row <= source.length; row += 1) matrix[row][0] = row;
  for (let column = 0; column <= target.length; column += 1) {
    matrix[0][column] = column;
  }

  for (let row = 1; row <= source.length; row += 1) {
    for (let column = 1; column <= target.length; column += 1) {
      const substitutionCost =
        source[row - 1] === target[column - 1] ? 0 : 1;
      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + substitutionCost,
      );

      if (
        row > 1 &&
        column > 1 &&
        source[row - 1] === target[column - 2] &&
        source[row - 2] === target[column - 1]
      ) {
        matrix[row][column] = Math.min(
          matrix[row][column],
          matrix[row - 2][column - 2] + 1,
        );
      }
    }
  }

  return matrix[source.length][target.length];
}

function acceptedNames(entity: LearningEntity): string[] {
  return [entity.displayNamePtBr, ...entity.aliasesPtBr];
}

function typoThreshold(targetLength: number): number {
  if (targetLength <= 4) return 0;
  if (targetLength <= 8) return 1;
  return 2;
}

export class CountryNameResolver {
  private readonly exactNames = new Map<string, string>();
  private readonly indexedNames: IndexedName[];
  private readonly entityIds: Set<string>;

  constructor(entities: readonly LearningEntity[]) {
    this.entityIds = new Set(entities.map(({ id }) => id));
    this.indexedNames = [];

    for (const entity of entities) {
      for (const rawName of acceptedNames(entity)) {
        const value = normalizeCountryName(rawName);
        if (!value) {
          throw new Error(`Nome vazio para a entidade ${entity.id}`);
        }

        const existingEntityId = this.exactNames.get(value);
        if (existingEntityId && existingEntityId !== entity.id) {
          throw new Error(
            `Alias normalizado "${value}" colide entre ${existingEntityId} e ${entity.id}`,
          );
        }

        if (!existingEntityId) {
          this.exactNames.set(value, entity.id);
          this.indexedNames.push({ entityId: entity.id, value });
        }
      }
    }
  }

  resolve(input: string): NameResolution {
    const normalizedInput = normalizeCountryName(input);
    if (!normalizedInput) return { kind: "empty" };

    const entityId = this.exactNames.get(normalizedInput);
    return entityId
      ? { kind: "exact", entityId }
      : { kind: "incorrect" };
  }

  classify(input: string, targetEntityId: string): NameResolution {
    if (!this.entityIds.has(targetEntityId)) {
      throw new Error(`Entidade desconhecida: ${targetEntityId}`);
    }

    const normalizedInput = normalizeCountryName(input);
    if (!normalizedInput) return { kind: "empty" };

    const exactEntityId = this.exactNames.get(normalizedInput);
    if (exactEntityId) {
      return exactEntityId === targetEntityId
        ? { kind: "exact", entityId: targetEntityId }
        : { kind: "incorrect", matchedEntityId: exactEntityId };
    }

    const distanceByEntity = new Map<string, number>();
    for (const indexedName of this.indexedNames) {
      const distance = damerauLevenshteinDistance(
        normalizedInput,
        indexedName.value,
      );
      const previous = distanceByEntity.get(indexedName.entityId);
      if (previous === undefined || distance < previous) {
        distanceByEntity.set(indexedName.entityId, distance);
      }
    }

    const targetDistance = distanceByEntity.get(targetEntityId);
    if (targetDistance === undefined) {
      throw new Error(`Entidade sem nome indexado: ${targetEntityId}`);
    }

    const targetNames = this.indexedNames.filter(
      ({ entityId }) => entityId === targetEntityId,
    );
    const nearestTargetLength = Math.min(
      ...targetNames
        .filter(
          ({ value }) =>
            damerauLevenshteinDistance(normalizedInput, value) ===
            targetDistance,
        )
        .map(({ value }) => Array.from(value).length),
    );
    const nearestDistance = Math.min(...distanceByEntity.values());
    const nearestCount = [...distanceByEntity.values()].filter(
      (distance) => distance === nearestDistance,
    ).length;

    if (
      targetDistance === nearestDistance &&
      nearestCount === 1 &&
      targetDistance <= typoThreshold(nearestTargetLength)
    ) {
      return {
        kind: "partial",
        entityId: targetEntityId,
        distance: targetDistance,
      };
    }

    return { kind: "incorrect" };
  }
}
