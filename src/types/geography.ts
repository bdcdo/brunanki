/**
 * Continente e sub-região de uma entidade, pela classificação M49 da Divisão
 * de Estatística da ONU.
 *
 * O ID e o rótulo são coisas separadas de propósito. O ID é o que o progresso
 * grava (o continente ativo, o filtro do álbum) e não pode mudar quando um
 * rótulo for revisto: trocar "América Setentrional" por "América do Norte"
 * não pode invalidar backup nenhum. O rótulo é só o que a tela mostra.
 *
 * A sub-região é a região intermediária da M49 quando ela existe, e a
 * sub-região quando não existe. É essa regra que parte "América Latina e
 * Caribe" em Caribe, América Central e América do Sul, e "África
 * Subsaariana" nas suas quatro regiões, sem nenhuma exceção escrita à mão.
 */

export const CONTINENT_IDS = [
  "americas",
  "africa",
  "asia",
  "europe",
  "oceania"
] as const;

export type ContinentId = (typeof CONTINENT_IDS)[number];

export const CONTINENT_LABEL_PT_BR: Record<ContinentId, string> = {
  americas: "Américas",
  africa: "África",
  asia: "Ásia",
  europe: "Europa",
  oceania: "Oceania"
};

export const SUBREGION_IDS = [
  "caribbean",
  "central-america",
  "south-america",
  "northern-america",
  "northern-africa",
  "western-africa",
  "middle-africa",
  "eastern-africa",
  "southern-africa",
  "western-asia",
  "central-asia",
  "southern-asia",
  "eastern-asia",
  "south-eastern-asia",
  "northern-europe",
  "western-europe",
  "southern-europe",
  "eastern-europe",
  "australia-new-zealand",
  "melanesia",
  "micronesia",
  "polynesia"
] as const;

export type SubregionId = (typeof SUBREGION_IDS)[number];

export const SUBREGION: Record<
  SubregionId,
  { readonly continent: ContinentId; readonly labelPtBr: string }
> = {
  caribbean: { continent: "americas", labelPtBr: "Caribe" },
  "central-america": { continent: "americas", labelPtBr: "América Central" },
  "south-america": { continent: "americas", labelPtBr: "América do Sul" },
  "northern-america": {
    continent: "americas",
    labelPtBr: "América Setentrional"
  },
  "northern-africa": { continent: "africa", labelPtBr: "Norte da África" },
  "western-africa": { continent: "africa", labelPtBr: "África Ocidental" },
  "middle-africa": { continent: "africa", labelPtBr: "África Central" },
  "eastern-africa": { continent: "africa", labelPtBr: "África Oriental" },
  "southern-africa": { continent: "africa", labelPtBr: "África Austral" },
  "western-asia": { continent: "asia", labelPtBr: "Ásia Ocidental" },
  "central-asia": { continent: "asia", labelPtBr: "Ásia Central" },
  "southern-asia": { continent: "asia", labelPtBr: "Sul da Ásia" },
  "eastern-asia": { continent: "asia", labelPtBr: "Ásia Oriental" },
  "south-eastern-asia": { continent: "asia", labelPtBr: "Sudeste Asiático" },
  "northern-europe": { continent: "europe", labelPtBr: "Norte da Europa" },
  "western-europe": { continent: "europe", labelPtBr: "Europa Ocidental" },
  "southern-europe": { continent: "europe", labelPtBr: "Sul da Europa" },
  "eastern-europe": { continent: "europe", labelPtBr: "Europa Oriental" },
  "australia-new-zealand": {
    continent: "oceania",
    labelPtBr: "Austrália e Nova Zelândia"
  },
  melanesia: { continent: "oceania", labelPtBr: "Melanésia" },
  micronesia: { continent: "oceania", labelPtBr: "Micronésia" },
  polynesia: { continent: "oceania", labelPtBr: "Polinésia" }
};
