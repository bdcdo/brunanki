/**
 * Normalização de nomes de entidades — fonte única.
 *
 * Vive num módulo sem nenhum import para que os scripts de catálogo, que usam
 * caminhos relativos e não resolvem o alias `@/`, possam consumi-la sem
 * reimplementá-la. Antes havia quatro versões desta função, com regex
 * divergentes: duas usavam `\p{Diacritic}` e duas `\p{M}`, e nem todas
 * colapsavam espaços — de modo que o mesmo nome digitado podia casar na busca
 * do catálogo e falhar na validação, ou vice-versa.
 *
 * A ordem das operações importa: a decomposição NFD precisa vir antes da
 * remoção das marcas, porque é ela que separa "ã" em "a" + til. `\p{M}` é
 * preferido a `\p{Diacritic}` por cobrir toda marca combinante, não apenas as
 * classificadas como diacríticas.
 */
export function normalizeCountryName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}
