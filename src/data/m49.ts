import {
  SUBREGION,
  type ContinentId,
  type SubregionId
} from "@/types/geography";

/**
 * Uma linha do snapshot M49 em `scripts/sources/m49.json`. Os códigos são
 * texto de três dígitos, como a ONU os publica: "005" e "5" não são o mesmo
 * código em nenhuma tabela dela, e o zero à esquerda é parte do identificador.
 */
export interface M49Area {
  readonly m49: string;
  readonly iso3: string;
  readonly name: string;
  readonly regionCode: string;
  readonly regionName: string;
  readonly subRegionCode: string;
  readonly subRegionName: string;
  readonly intermediateRegionCode: string;
  readonly intermediateRegionName: string;
}

export interface M49Snapshot {
  readonly source: string;
  readonly url: string;
  readonly retrievedAt: string;
  readonly areas: readonly M49Area[];
}

/**
 * A ponte entre o código da ONU e o ID estável do app. É só tradução de
 * vocabulário: nenhuma entidade aparece aqui pelo nome, e é isso que torna
 * exceção manual inexprimível. Um país que mudasse de região na M49 mudaria
 * no app pelo snapshot, e não por uma linha escrita nesta tabela.
 */
const CONTINENT_BY_M49: Record<string, ContinentId> = {
  "019": "americas",
  "002": "africa",
  "142": "asia",
  "150": "europe",
  "009": "oceania"
};

const SUBREGION_BY_M49: Record<string, SubregionId> = {
  "029": "caribbean",
  "013": "central-america",
  "005": "south-america",
  "021": "northern-america",
  "015": "northern-africa",
  "011": "western-africa",
  "017": "middle-africa",
  "014": "eastern-africa",
  "018": "southern-africa",
  "145": "western-asia",
  "143": "central-asia",
  "034": "southern-asia",
  "030": "eastern-asia",
  "035": "south-eastern-asia",
  "154": "northern-europe",
  "155": "western-europe",
  "039": "southern-europe",
  "151": "eastern-europe",
  "053": "australia-new-zealand",
  "054": "melanesia",
  "057": "micronesia",
  "061": "polynesia"
};

export interface Geography {
  readonly continent: ContinentId;
  readonly subregion: SubregionId;
}

/**
 * Indexa o snapshot por código M49 e falha em código repetido: duas linhas
 * para o mesmo código dariam duas sub-regiões possíveis a uma entidade, e a
 * escolha dependeria da ordem do arquivo.
 */
export function indexM49(snapshot: M49Snapshot): ReadonlyMap<string, M49Area> {
  const byCode = new Map<string, M49Area>();
  for (const area of snapshot.areas) {
    if (byCode.has(area.m49)) {
      throw new Error(`Código M49 repetido no snapshot: ${area.m49}`);
    }
    byCode.set(area.m49, area);
  }
  return byCode;
}

/**
 * A sub-região é a região intermediária quando a M49 tem uma, e a sub-região
 * quando não tem; ver `src/types/geography.ts`. Código sem tradução derruba a
 * geração nomeando a entidade, em vez de cair num padrão silencioso.
 */
export function geographyFor(
  entityId: string,
  m49Code: string | undefined,
  index: ReadonlyMap<string, M49Area>
): Geography {
  if (!m49Code) {
    throw new Error(`Entidade sem código M49: ${entityId}`);
  }
  const area = index.get(m49Code);
  if (!area) {
    throw new Error(`Código M49 ausente do snapshot: ${m49Code} (${entityId})`);
  }
  const continent = CONTINENT_BY_M49[area.regionCode];
  if (!continent) {
    throw new Error(
      `Região M49 sem continente: ${area.regionCode} (${entityId})`
    );
  }
  const subregionCode = area.intermediateRegionCode || area.subRegionCode;
  const subregion = SUBREGION_BY_M49[subregionCode];
  if (!subregion) {
    throw new Error(`Sub-região M49 sem ID: ${subregionCode} (${entityId})`);
  }
  // As duas tabelas de tradução são independentes, e esta conferência é o
  // que impede uma delas de pôr a sub-região num continente e a outra noutro.
  if (SUBREGION[subregion].continent !== continent) {
    throw new Error(
      `Sub-região ${subregion} fora do continente ${continent} (${entityId})`
    );
  }
  return { continent, subregion };
}
