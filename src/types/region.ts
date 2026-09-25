/**
 * A região de uma entidade, em português.
 *
 * Vive em módulo próprio, e não em `catalog.ts` ou em `runtime-catalog.ts`,
 * porque os dois precisam dela e o contrato de runtime declara não importar do
 * catálogo completo — a região não é vocabulário de procedência, como
 * `Organization` era, mas os dois artefatos a carregam.
 *
 * Conjunto fechado, e não `string`, e é o tipo que faz o trabalho: enquanto era
 * `string`, o valor cru do restcountries — `"Americas"`, `"Europe"`, `"Asia"` —
 * atravessava o gerador, o artefato commitado e o cliente sem que nada
 * acusasse, e um app inteiramente em português exibia "Asia" em 47 cartões do
 * catálogo. Agora um valor não traduzido não compila.
 *
 * "Américas" no plural porque é o que o recorte da fonte descreve: as três,
 * num continente só.
 */
export type Region = "África" | "Américas" | "Ásia" | "Europa" | "Oceania";
