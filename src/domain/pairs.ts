/**
 * A chave de um par de bandeiras, igual qualquer que seja a ordem.
 *
 * O par Chade e Romênia é um só objeto de estudo: o exercício que mostra o
 * Chade e o que mostra a Romênia treinam a mesma discriminação e precisam
 * gravar no mesmo cartão. Ordenar os dois IDs antes de juntar é o que torna
 * duas chaves para o mesmo par inexprimíveis. O separador `|` não aparece em
 * ID de entidade, que é ISO-3 em caixa baixa.
 */
export function pairStateId(first: string, second: string): string {
  if (first === second) {
    throw new Error(`Um par precisa de duas entidades distintas: ${first}`);
  }
  return [first, second].sort().join("|");
}

/** Os dois IDs do par, na ordem canônica da chave. */
export function pairEntityIds(
  first: string,
  second: string
): readonly [string, string] {
  const [left, right] = [first, second].sort();
  return [left!, right!];
}
