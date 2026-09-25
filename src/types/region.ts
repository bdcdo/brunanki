/**
 * A região que o restcountries atribuía, em português. Sobrevive só para
 * tipar o campo legado do catálogo completo, que o refresh não grava mais; a
 * geografia do app é `ContinentId` e `SubregionId`, em `@/types/geography`.
 */
export type Region = "África" | "Américas" | "Ásia" | "Europa" | "Oceania";
