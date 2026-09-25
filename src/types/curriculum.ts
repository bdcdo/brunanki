/**
 * Um par de bandeiras que se confundem, com o traço que separa cada uma.
 *
 * Mora em `@/types`, e não junto do currículo em `@/data`, porque o domínio
 * precisa dele para explicar um erro e não pode importar de `@/data`.
 *
 * O traço é escrito do ponto de vista da bandeira que ele descreve, porque é
 * o que o feedback de erro diz: quem marcou Colômbia vendo o Equador precisa
 * ouvir o que o Equador tem, e o que a Colômbia não tem.
 */
export interface CuratedPair {
  readonly entityIds: readonly [string, string];
  /** Por que as duas se confundem, numa frase. */
  readonly reason: string;
  /** O que identifica cada uma diante da outra, indexado pelo ID. */
  readonly traits: Readonly<Record<string, string>>;
}
