import { normalizeCountryName } from "./text";

export { normalizeCountryName };

/**
 * O mínimo para indexar uma entidade por nome. Estrutural de propósito: serve
 * tanto ao catálogo completo quanto ao de runtime, sem que o domínio precise
 * conhecer qual dos dois o chamador tem em mãos.
 */
export interface NameableEntity {
  id: string;
  displayNamePtBr: string;
  aliasesPtBr: readonly string[];
}

export type NameResolution =
  | { kind: "empty" }
  | { kind: "exact"; entityId: string }
  | { kind: "partial"; entityId: string; distance: number }
  | { kind: "incorrect"; matchedEntityId?: string };

interface IndexedName {
  entityId: string;
  value: string;
  /** Comprimento em pontos de código, pré-computado: entra no limiar de erro
   *  de digitação e seria recalculado a cada classificação. */
  length: number;
}

/** Nome mais parecido de uma entidade com a entrada sendo classificada. */
interface NearestName {
  distance: number;
  length: number;
}

export function damerauLevenshteinDistance(
  left: string,
  right: string
): number {
  const source = Array.from(left);
  const target = Array.from(right);
  const matrix = Array.from({ length: source.length + 1 }, () =>
    Array<number>(target.length + 1).fill(0)
  );

  for (let row = 0; row <= source.length; row += 1) matrix[row][0] = row;
  for (let column = 0; column <= target.length; column += 1) {
    matrix[0][column] = column;
  }

  for (let row = 1; row <= source.length; row += 1) {
    for (let column = 1; column <= target.length; column += 1) {
      const substitutionCost = source[row - 1] === target[column - 1] ? 0 : 1;
      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + substitutionCost
      );

      if (
        row > 1 &&
        column > 1 &&
        source[row - 1] === target[column - 2] &&
        source[row - 2] === target[column - 1]
      ) {
        matrix[row][column] = Math.min(
          matrix[row][column],
          matrix[row - 2][column - 2] + 1
        );
      }
    }
  }

  return matrix[source.length][target.length];
}

function acceptedNames(entity: NameableEntity): string[] {
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

  constructor(entities: readonly NameableEntity[]) {
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
            `Alias normalizado "${value}" colide entre ${existingEntityId} e ${entity.id}`
          );
        }

        if (!existingEntityId) {
          this.exactNames.set(value, entity.id);
          this.indexedNames.push({
            entityId: entity.id,
            value,
            length: Array.from(value).length
          });
        }
      }
    }
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

    // Um único passe guarda, por entidade, a menor distância e o comprimento
    // do nome que a atingiu. Antes o comprimento saía de um segundo passe que
    // recalculava a distância de Damerau-Levenshtein para os nomes do alvo —
    // o cálculo mais caro do módulo, feito duas vezes.
    const nearestByEntity = new Map<string, NearestName>();
    for (const indexedName of this.indexedNames) {
      const distance = damerauLevenshteinDistance(
        normalizedInput,
        indexedName.value
      );
      const previous = nearestByEntity.get(indexedName.entityId);
      // Empate de distância resolve pelo nome mais curto, que é o que define
      // o limiar de erro de digitação tolerado.
      if (
        previous === undefined ||
        distance < previous.distance ||
        (distance === previous.distance && indexedName.length < previous.length)
      ) {
        nearestByEntity.set(indexedName.entityId, {
          distance,
          length: indexedName.length
        });
      }
    }

    const target = nearestByEntity.get(targetEntityId);
    if (target === undefined) {
      throw new Error(`Entidade sem nome indexado: ${targetEntityId}`);
    }
    const targetDistance = target.distance;
    const nearestTargetLength = target.length;

    let nearestDistance = Infinity;
    let nearestCount = 0;
    for (const { distance } of nearestByEntity.values()) {
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestCount = 1;
      } else if (distance === nearestDistance) {
        nearestCount += 1;
      }
    }

    if (
      targetDistance === nearestDistance &&
      nearestCount === 1 &&
      targetDistance <= typoThreshold(nearestTargetLength)
    ) {
      return {
        kind: "partial",
        entityId: targetEntityId,
        distance: targetDistance
      };
    }

    return { kind: "incorrect" };
  }
}
