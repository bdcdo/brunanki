export type RandomSource = () => number;

function nextIndex(random: RandomSource, upperBound: number): number {
  const value = random();
  if (value < 0 || value >= 1) {
    throw new RangeError("A fonte aleatória deve retornar valores em [0, 1)");
  }
  return Math.floor(value * upperBound);
}

/**
 * Embaralhamento de Fisher-Yates com fonte aleatória injetável.
 *
 * Estava embutido em `shuffledEntityOrder`, do diagnóstico, e a sessão de
 * estudo tinha o seu próprio "embaralhamento" que ordenava por
 * `JSON.stringify` — caro e, pior, estável: a mesma entrada produzia sempre a
 * mesma ordem.
 */
export function shuffle<T>(items: readonly T[], random: RandomSource): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const otherIndex = nextIndex(random, index + 1);
    [result[index], result[otherIndex]] = [result[otherIndex], result[index]];
  }
  return result;
}

/**
 * Sorteio ponderado sem reposição.
 *
 * Peso maior aumenta a chance de sair primeiro, sem tornar a escolha
 * determinística — é o que permite favorecer bandeiras parecidas mantendo
 * variedade entre sessões.
 */
export function weightedSample<T>(
  items: readonly T[],
  weightOf: (item: T) => number,
  count: number,
  random: RandomSource
): T[] {
  const pool = items.map((item) => ({
    item,
    weight: Math.max(0, weightOf(item))
  }));
  const chosen: T[] = [];

  while (chosen.length < count && pool.length > 0) {
    const total = pool.reduce((sum, entry) => sum + entry.weight, 0);
    let pick: number;
    if (total <= 0) {
      pick = nextIndex(random, pool.length);
    } else {
      let threshold = random() * total;
      pick = pool.length - 1;
      for (let index = 0; index < pool.length; index += 1) {
        threshold -= pool[index].weight;
        if (threshold <= 0) {
          pick = index;
          break;
        }
      }
    }
    chosen.push(pool[pick].item);
    pool.splice(pick, 1);
  }

  return chosen;
}

/**
 * Gerador determinístico para testes — nunca para a sessão real, que usa
 * `Math.random` justamente para variar a cada rodada.
 */
export function mulberry32(seed: number): RandomSource {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
