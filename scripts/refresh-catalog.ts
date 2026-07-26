import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { promisify } from "node:util";

import { normalizeCountryName as normalizeAlias } from "../src/domain/text";
import { projectRuntimeCatalog } from "../src/data/project-runtime-catalog";
import { belongsToCatalog, UN_OBSERVER_ISO3 } from "./catalog-rules";
import { readPalettes } from "./extract-palette";
import type {
  Catalog,
  FlagRevision,
  LearningEntity
} from "../src/types/catalog";

const VERIFIED_AT = "2026-07-25";
// A versão sobe porque o conjunto de entidades mudou, ainda que as fontes não
// tenham sido reconferidas (daí `VERIFIED_AT` parado). Sem isso, dois
// catálogos com conteúdos diferentes carregariam o mesmo rótulo, e um backup
// exportado antes do corte seria indistinguível de um posterior.
const CATALOG_VERSION = "2026.07.26";
const USER_AGENT =
  "Ptanki/0.1 (educational flag catalog; contact: local development)";
const execFileAsync = promisify(execFile);

const UN_SOURCE_URL = "https://www.un.org/en/about-us/member-states";
const FIFA_SOURCE_URL = "https://inside.fifa.com/en/about-fifa/associations";
const FIFA_CODES_PAGE = "List_of_FIFA_country_codes";
const REST_COUNTRIES_DATA_URL =
  "https://gitlab.com/restcountries/restcountries/-/raw/master/src/main/resources/countriesV3.1.json";

interface RestCountry {
  name: { common: string; official: string };
  cca2?: string;
  cca3: string;
  ccn3?: string;
  fifa?: string;
  region?: string;
  translations?: { por?: { common: string; official: string } };
  altSpellings?: string[];
  unMember?: boolean;
}

interface FifaAssociation {
  name: string;
  code: string;
}

interface WikidataCountry {
  qid: `Q${number}`;
  flagTitle: `File:${string}`;
}

interface CommonsMetadata {
  title: `File:${string}`;
  descriptionUrl: string;
  originalUrl: string;
  sha1: string;
  mime: "image/svg+xml" | "image/png";
  width: number;
  height: number;
  license: FlagRevision["license"];
}

/**
 * Associações da FIFA que não correspondem a um Estado reconhecido pela ONU.
 *
 * As quatro nações constituintes do Reino Unido competem separadamente no
 * futebol e não têm assento próprio na ONU; com o catálogo definido pela ONU,
 * elas não geram entidade. Continuam nomeadas — em vez de simplesmente
 * ignoradas por falharem o mapeamento — para que uma associação *nova* sem
 * contraparte ISO ainda derrube o refresh, em vez de sumir calada.
 */
const FIFA_CODES_WITHOUT_UN_STATE = new Set(["ENG", "NIR", "SCO", "WAL"]);

const REST_COUNTRY_BY_FIFA_OVERRIDE: Record<string, string> = {
  SGP: "SGP"
};

const QID_OVERRIDE_BY_ISO3: Record<string, `Q${number}`> = {
  PSE: "Q219060",
  VAT: "Q237"
};

const FLAG_OVERRIDE_BY_ISO3: Record<string, `File:${string}`> = {
  PRY: "File:Flag of Paraguay.svg"
};

const DISPLAY_NAME_OVERRIDE_BY_ISO3: Record<string, string> = {
  ARM: "Armênia",
  AZE: "Azerbaijão",
  BWA: "Botsuana",
  COD: "República Democrática do Congo",
  COG: "República do Congo",
  CZE: "Chéquia",
  DJI: "Djibuti",
  EST: "Estônia",
  GMB: "Gâmbia",
  GBR: "Reino Unido",
  IRN: "Irã",
  LVA: "Letônia",
  KOR: "Coreia do Sul",
  KEN: "Quênia",
  LAO: "Laos",
  MCO: "Mônaco",
  MKD: "Macedônia do Norte",
  NLD: "Países Baixos",
  PER: "Peru",
  POL: "Polônia",
  PRK: "Coreia do Norte",
  PSE: "Palestina",
  ROU: "Romênia",
  SVN: "Eslovênia",
  SWZ: "Essuatíni",
  TLS: "Timor-Leste",
  USA: "Estados Unidos",
  VAT: "Vaticano",
  VCT: "São Vicente e Granadinas",
  VNM: "Vietnã",
  YEM: "Iêmen",
  ZWE: "Zimbábue"
};

const EDITORIAL_NOTE_BY_ISO3: Record<string, string> = {
  PRY: "O exercício usa o anverso da bandeira do Paraguai.",
  VAT: "A Santa Sé é Estado observador permanente da ONU; a bandeira exibida é a do Estado da Cidade do Vaticano."
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function fetchWithRetry(url: string, attempts = 4): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(45_000)
      });
      if (response.ok) return response;
      lastError = new Error(
        `${response.status} ${response.statusText}: ${url}`
      );
      if (response.status === 429) {
        const retryAfterSeconds = Number(response.headers.get("retry-after"));
        await new Promise((resolve) =>
          setTimeout(
            resolve,
            Number.isFinite(retryAfterSeconds)
              ? retryAfterSeconds * 1_000
              : attempt * 1_500
          )
        );
      }
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }
  }
  throw lastError;
}

async function fetchJson<T>(url: string): Promise<T> {
  return (await (await fetchWithRetry(url)).json()) as T;
}

function decodeHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number(code))
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16))
    )
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#039;", "'")
    .replaceAll("&nbsp;", " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchFifaAssociations(): Promise<FifaAssociation[]> {
  const url =
    "https://en.wikipedia.org/w/api.php?action=parse&prop=text&format=json&formatversion=2&page=" +
    FIFA_CODES_PAGE;
  const result = await fetchJson<{ parse: { text: string } }>(url);
  const tables = [
    ...result.parse.text.matchAll(/<table[^>]*wikitable[\s\S]*?<\/table>/g)
  ].slice(0, 4);
  const associations = tables.flatMap(([table]) =>
    [...table.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].flatMap(([, row]) => {
      const cells = [...row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map(
        ([, cell]) => decodeHtml(cell)
      );
      return cells.length === 2 && /^[A-Z]{3}$/.test(cells[1])
        ? [{ name: cells[0], code: cells[1] }]
        : [];
    })
  );
  assert(
    associations.length === 211,
    `Expected 211 FIFA members, found ${associations.length}`
  );
  assert(
    new Set(associations.map(({ code }) => code)).size === 211,
    "FIFA codes are not unique"
  );
  return associations;
}

async function fetchWikidataCountries(): Promise<Map<string, WikidataCountry>> {
  const query = `SELECT ?item ?iso3 ?flag WHERE {
    ?item wdt:P298 ?iso3;
      wdt:P41 ?flag.
  }`;
  const url =
    "https://query.wikidata.org/sparql?format=json&query=" +
    encodeURIComponent(query);
  const result = await fetchJson<{
    results: {
      bindings: Array<{
        item: { value: string };
        iso3: { value: string };
        flag: { value: string };
      }>;
    };
  }>(url);
  const byIso3 = new Map<string, WikidataCountry>();
  for (const binding of result.results.bindings) {
    const iso3 = binding.iso3.value;
    const qid = basename(binding.item.value) as `Q${number}`;
    if (iso3 === "PSE" && qid !== "Q219060") continue;
    const fileName = decodeURIComponent(basename(binding.flag.value));
    byIso3.set(iso3, { qid, flagTitle: `File:${fileName}` });
  }
  return byIso3;
}

function uniqueAliases(
  values: Array<string | undefined>,
  displayName: string
): string[] {
  const displayKey = normalizeAlias(displayName);
  const seen = new Set<string>();
  return values.flatMap((value) => {
    if (!value) return [];
    const cleaned = value.trim();
    const key = normalizeAlias(cleaned);
    if (!key || key === displayKey || seen.has(key)) return [];
    seen.add(key);
    return [cleaned];
  });
}

function stripMarkup(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  return decodeHtml(value).replace(/\s+/g, " ").trim() || undefined;
}

async function fetchCommonsMetadata(
  titles: Array<`File:${string}`>
): Promise<Map<string, CommonsMetadata>> {
  const metadata = new Map<string, CommonsMetadata>();
  for (let index = 0; index < titles.length; index += 40) {
    const batch = titles.slice(index, index + 40);
    const params = new URLSearchParams({
      action: "query",
      prop: "imageinfo",
      iiprop: "url|sha1|mime|size|extmetadata",
      format: "json",
      formatversion: "2",
      titles: batch.join("|")
    });
    const result = await fetchJson<{
      query: {
        pages: Array<{
          title: string;
          missing?: boolean;
          imageinfo?: Array<{
            url: string;
            descriptionurl: string;
            sha1: string;
            mime: string;
            width: number;
            height: number;
            extmetadata?: Record<string, { value?: unknown }>;
          }>;
        }>;
      };
    }>(`https://commons.wikimedia.org/w/api.php?${params}`);
    for (const page of result.query.pages) {
      assert(
        !page.missing && page.imageinfo?.[0],
        `Commons file not found: ${page.title}`
      );
      const info = page.imageinfo[0];
      assert(
        info.mime === "image/svg+xml" || info.mime === "image/png",
        `Unsupported flag MIME ${info.mime}: ${page.title}`
      );
      const ext = info.extmetadata ?? {};
      const shortName =
        stripMarkup(ext.LicenseShortName?.value) ??
        stripMarkup(ext.UsageTerms?.value) ??
        "Public domain";
      metadata.set(page.title.replaceAll("_", " "), {
        title: page.title.replaceAll("_", " ") as `File:${string}`,
        descriptionUrl: info.descriptionurl,
        originalUrl: info.url,
        sha1: info.sha1,
        mime: info.mime,
        width: info.width,
        height: info.height,
        license: {
          shortName,
          url: stripMarkup(ext.LicenseUrl?.value),
          artist: stripMarkup(ext.Artist?.value),
          credit: stripMarkup(ext.Credit?.value),
          attributionRequired: !/public domain|cc0/i.test(shortName)
        }
      });
    }
  }
  return metadata;
}

async function downloadCommonsOriginal(
  metadata: CommonsMetadata,
  destination: string,
  derivedAsset = false
): Promise<void> {
  try {
    const existing = await readFile(destination);
    const existingSha1 = createHash("sha1").update(existing).digest("hex");
    if (existingSha1 === metadata.sha1 || derivedAsset) {
      if (derivedAsset) metadata.sha1 = existingSha1;
      return;
    }
  } catch {
    // A missing or unreadable destination is downloaded below.
  }
  await execFileAsync(
    "curl",
    [
      "-L",
      "--fail",
      "--silent",
      "--show-error",
      "--retry",
      "4",
      "--retry-all-errors",
      "--max-time",
      "90",
      "-A",
      USER_AGENT,
      "-o",
      destination,
      metadata.originalUrl
    ],
    { maxBuffer: 1024 * 1024 }
  );
  const bytes = await readFile(destination);
  const sha1 = createHash("sha1").update(bytes).digest("hex");
  if (derivedAsset) metadata.sha1 = sha1;
  assert(
    sha1 === metadata.sha1,
    `SHA-1 mismatch for ${metadata.title}: ${sha1} != ${metadata.sha1}`
  );
}

function entityIdForCountry(country: RestCountry): string {
  return country.cca3.toLocaleLowerCase("en-US");
}

function findCountryForAssociation(
  association: FifaAssociation,
  countries: RestCountry[]
): RestCountry | undefined {
  const overrideIso3 = REST_COUNTRY_BY_FIFA_OVERRIDE[association.code];
  if (overrideIso3) return countries.find(({ cca3 }) => cca3 === overrideIso3);
  return (
    countries.find(({ fifa }) => fifa === association.code) ??
    countries.find(({ cca3 }) => cca3 === association.code) ??
    countries.find(({ name }) => name.common === association.name)
  );
}

async function main(): Promise<void> {
  const [countries, fifaAssociations, wikidataByIso3] = await Promise.all([
    fetchJson<RestCountry[]>(REST_COUNTRIES_DATA_URL),
    fetchFifaAssociations(),
    fetchWikidataCountries()
  ]);
  assert(
    countries.length >= 249,
    `Country reference data is incomplete (${countries.length})`
  );

  // The upstream snapshot currently marks Guinea-Bissau incorrectly. Keeping the
  // correction explicit makes the 193-member invariant reviewable instead of
  // silently accepting a malformed source record.
  const unIso3 = new Set(
    countries
      .filter(({ unMember }) => unMember)
      .map(({ cca3 }) => cca3)
      .concat("GNB")
  );
  assert(unIso3.size === 193, `Expected 193 UN members, found ${unIso3.size}`);

  const fifaByIso3 = new Map<string, FifaAssociation>();
  for (const association of fifaAssociations) {
    if (FIFA_CODES_WITHOUT_UN_STATE.has(association.code)) continue;
    const country = findCountryForAssociation(association, countries);
    assert(
      country,
      `Could not map FIFA association ${association.name} (${association.code})`
    );
    assert(
      !fifaByIso3.has(country.cca3),
      `Two FIFA associations map to ${country.cca3}`
    );
    fifaByIso3.set(country.cca3, association);
  }

  // A raiz do conjunto é a ONU, e só ela. A filiação à FIFA ainda é anotada
  // como procedência em `memberships`, mas deixou de decidir quem entra — era
  // por ela que a Palestina chegava ao catálogo, para só depois receber o
  // status de observadora.
  const includedIso3 = new Set<string>([...unIso3, ...UN_OBSERVER_ISO3]);
  const entities: LearningEntity[] = [];
  const requestedFlagTitles = new Map<string, `File:${string}`>();

  for (const iso3 of [...includedIso3].sort()) {
    const country = countries.find(({ cca3 }) => cca3 === iso3);
    assert(country, `Country reference missing for ${iso3}`);
    const fifa = fifaByIso3.get(iso3);
    const qid = QID_OVERRIDE_BY_ISO3[iso3] ?? wikidataByIso3.get(iso3)?.qid;
    const flagTitle =
      FLAG_OVERRIDE_BY_ISO3[iso3] ?? wikidataByIso3.get(iso3)?.flagTitle;
    assert(qid, `Wikidata QID missing for ${iso3}`);
    assert(flagTitle, `Wikimedia Commons flag missing for ${iso3}`);
    const id = entityIdForCountry(country);
    const displayName =
      DISPLAY_NAME_OVERRIDE_BY_ISO3[iso3] ??
      country.translations?.por?.common ??
      country.name.common;
    const isUnObserver = (UN_OBSERVER_ISO3 as readonly string[]).includes(iso3);
    const memberships: LearningEntity["memberships"] = [];
    if (unIso3.has(iso3)) {
      memberships.push({
        organization: "UN",
        status: "member",
        sourceUrl: UN_SOURCE_URL,
        verifiedAt: VERIFIED_AT
      });
    } else if (isUnObserver) {
      memberships.push({
        organization: "UN",
        status: "observer",
        sourceUrl: "https://www.un.org/en/about-us/non-member-states",
        verifiedAt: VERIFIED_AT
      });
    }
    if (fifa) {
      memberships.push({
        organization: "FIFA",
        status: "member",
        sourceUrl: FIFA_SOURCE_URL,
        verifiedAt: VERIFIED_AT
      });
    }
    entities.push({
      id,
      displayNamePtBr: displayName,
      aliasesPtBr: uniqueAliases(
        [
          country.name.common,
          country.name.official,
          country.translations?.por?.official,
          ...(country.altSpellings ?? []),
          fifa?.name,
          iso3 === "VAT" ? "Santa Sé" : undefined
        ],
        displayName
      ),
      sourceNames: {
        ...(unIso3.has(iso3) || isUnObserver
          ? {
              un:
                iso3 === "VAT"
                  ? "Holy See"
                  : iso3 === "PSE"
                    ? "State of Palestine"
                    : country.name.common
            }
          : {}),
        ...(fifa ? { fifa: fifa.name } : {})
      },
      identifiers: {
        wikidataQid: qid,
        ...(fifa ? { fifaCode: fifa.code } : {}),
        ...(country.cca2 ? { isoAlpha2: country.cca2 } : {}),
        isoAlpha3: country.cca3,
        ...(country.ccn3 ? { unM49: country.ccn3 } : {})
      },
      region: country.region ?? "Other",
      memberships,
      primaryFlagRevisionId: `${id}-flag-2026`,
      ...(EDITORIAL_NOTE_BY_ISO3[iso3]
        ? { editorialNote: EDITORIAL_NOTE_BY_ISO3[iso3] }
        : {})
    });
    requestedFlagTitles.set(id, flagTitle);
  }

  entities.sort((left, right) =>
    left.displayNamePtBr.localeCompare(right.displayNamePtBr, "pt-BR")
  );
  // Sem literal: o tamanho esperado é o censo conferido acima mais os
  // observadores nomeados. `belongsToCatalog` é a mesma regra que
  // `validate-catalog.ts` aplica ao artefato commitado.
  assert(
    entities.length === unIso3.size + UN_OBSERVER_ISO3.length,
    `Expected ${unIso3.size + UN_OBSERVER_ISO3.length} entities, found ${entities.length}`
  );
  assert(
    entities.every(belongsToCatalog),
    "Every entity must have a UN membership"
  );

  const commonsMetadata = await fetchCommonsMetadata([
    ...new Set(requestedFlagTitles.values())
  ]);
  const vaticanMetadata = commonsMetadata.get(
    "File:Flag of Vatican City (2023–present).svg"
  );
  assert(vaticanMetadata, "Vatican Commons metadata is missing");
  const vaticanOriginalName = basename(vaticanMetadata.originalUrl);
  vaticanMetadata.originalUrl = vaticanMetadata.originalUrl
    .replace("/wikipedia/commons/", "/wikipedia/commons/thumb/")
    .concat(`/500px-${vaticanOriginalName}.png`);
  vaticanMetadata.mime = "image/png";
  vaticanMetadata.width = 500;
  vaticanMetadata.height = 500;
  const flagsDirectory = join(process.cwd(), "public", "flags");
  await mkdir(flagsDirectory, { recursive: true });
  const flagRevisions: FlagRevision[] = [];

  for (let index = 0; index < entities.length; index += 8) {
    const batch = entities.slice(index, index + 8);
    const revisions = await Promise.all(
      batch.map(async (entity): Promise<FlagRevision> => {
        const requestedTitle = requestedFlagTitles.get(entity.id);
        assert(requestedTitle, `Flag title missing for ${entity.id}`);
        const metadata =
          commonsMetadata.get(requestedTitle.replaceAll("_", " ")) ??
          [...commonsMetadata.values()].find(
            ({ title }) =>
              title.toLocaleLowerCase("en-US") ===
              requestedTitle.replaceAll("_", " ").toLocaleLowerCase("en-US")
          );
        assert(metadata, `Commons metadata missing for ${requestedTitle}`);
        const extension = metadata.mime === "image/svg+xml" ? ".svg" : ".png";
        const fileName = `${entity.id}${extension}`;
        await downloadCommonsOriginal(
          metadata,
          join(flagsDirectory, fileName),
          entity.id === "vat"
        );
        return {
          id: entity.primaryFlagRevisionId,
          entityId: entity.id,
          // Literais, e não um `?? "national"` sobre uma tabela de exceções:
          // as únicas revisões territoriais ou de uso corrente eram as das
          // nações do Reino Unido e a de Taiwan, e nenhuma delas é um Estado
          // reconhecido pela ONU. Todo Estado-membro ou observador hastea a
          // própria bandeira oficial.
          representationKind: "national",
          officialStatus: "official",
          side: entity.id === "pry" ? "obverse" : "same-both-sides",
          filePath: `/flags/${fileName}`,
          commons: {
            fileTitle: metadata.title,
            descriptionUrl: metadata.descriptionUrl,
            originalUrl: metadata.originalUrl,
            sha1: metadata.sha1,
            mime: metadata.mime,
            width: metadata.width,
            height: metadata.height
          },
          license: metadata.license,
          reviewedAt: VERIFIED_AT
        };
      })
    );
    flagRevisions.push(...revisions);
  }

  const catalog: Catalog = {
    version: CATALOG_VERSION,
    verifiedAt: VERIFIED_AT,
    entities,
    flagRevisions
  };
  const dataDirectory = join(process.cwd(), "src", "data");
  await mkdir(dataDirectory, { recursive: true });
  await writeFile(
    join(dataDirectory, "catalog.json"),
    `${JSON.stringify(catalog, null, 2)}\n`
  );
  // O catálogo de runtime é derivado do completo por projectRuntimeCatalog;
  // regerar aqui evita que os dois artefatos saiam de sincronia.
  const palettes = await readPalettes(
    process.cwd(),
    new Map(flagRevisions.map((flag) => [flag.entityId, flag.filePath]))
  );
  await writeFile(
    join(dataDirectory, "runtime-catalog.json"),
    `${JSON.stringify(projectRuntimeCatalog(catalog, palettes), null, 2)}\n`
  );
  console.log(
    `Catalog refreshed: ${entities.length} entities, ${flagRevisions.length} local flags.`
  );
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
