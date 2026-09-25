import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { basename, join } from "node:path";

import { normalizeCountryName as normalize } from "../src/domain/text";
import catalogJson from "../src/data/catalog.json";
import m49Json from "./sources/m49.json";
import { geographyFor, indexM49, type M49Snapshot } from "../src/data/m49";
import runtimeCatalogJson from "../src/data/runtime-catalog.json";
import type { RuntimeCatalog } from "../src/types/runtime-catalog";
import { CURRICULUM, undecidedConfusablePairs } from "../src/data/curriculum";
import { pairStateId } from "../src/domain/pairs";
import { CONTINENT_IDS } from "../src/types/geography";
import type { Catalog } from "../src/types/catalog";
import {
  ATTRIBUTION_PATH,
  buildAttributionMarkdown
} from "./build-attribution";
import { unMembership, UN_OBSERVER_ENTITY_IDS } from "./catalog-rules";

/**
 * Censo da ONU em 26/07/2026, conferido contra
 * https://www.un.org/en/about-us/member-states.
 *
 * Fica como número explícito, e não derivado do artefato, porque é justamente
 * aqui que drift silencioso deve doer: se o gerador passar a produzir 192 ou
 * 194 membros, alguém tem de olhar e decidir, em vez de o gate se ajustar.
 */
const UN_MEMBER_COUNT = 193;

const FLAGS_DIRECTORY = join(process.cwd(), "public", "flags");

const catalog = catalogJson as Catalog;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main(): Promise<void> {
  // A regra de pertencimento é invariante, não contagem: toda entidade tem
  // filiação à ONU, e o tamanho do catálogo é consequência do censo mais os
  // observadores nomeados. Nenhum literal 195 no repositório — ele emerge.
  const withoutUn = catalog.entities
    .filter((entity) => unMembership(entity) === undefined)
    .map(({ id }) => id);
  assert(
    withoutUn.length === 0,
    `Entities without a UN membership: ${withoutUn.join(", ")}`
  );

  const members = catalog.entities.filter(
    (entity) => unMembership(entity)?.status === "member"
  );
  const observers = catalog.entities
    .filter((entity) => unMembership(entity)?.status === "observer")
    .map(({ id }) => id)
    .sort();
  assert(
    members.length === UN_MEMBER_COUNT,
    `Catalog must contain ${UN_MEMBER_COUNT} UN members, found ${members.length}`
  );
  // Exaustivo, e não "vat existe": a Palestina chegava ao catálogo por ser
  // associação da FIFA, e uma mudança no eixo esportivo a faria desaparecer
  // sem que nenhum assert acusasse. Agora some daqui se sumir de lá.
  assert(
    observers.join(",") === [...UN_OBSERVER_ENTITY_IDS].sort().join(","),
    `UN observers must be exactly ${UN_OBSERVER_ENTITY_IDS.join(", ")}, found ${observers.join(", ")}`
  );
  assert(
    catalog.entities.length === members.length + observers.length,
    "Every entity is either a UN member or a UN observer"
  );
  assert(
    catalog.flagRevisions.length === catalog.entities.length,
    "Every entity must have exactly one primary flag revision"
  );

  const ids = new Set<string>();
  const revisionIds = new Set<string>();
  const aliases = new Map<string, string>();
  const revisionsById = new Map(
    catalog.flagRevisions.map((revision) => [revision.id, revision])
  );

  for (const entity of catalog.entities) {
    assert(!ids.has(entity.id), `Duplicate entity ID: ${entity.id}`);
    ids.add(entity.id);
    assert(
      /^Q\d+$/.test(entity.identifiers.wikidataQid),
      `Invalid QID: ${entity.id}`
    );
    assert(entity.memberships.length > 0, `No membership: ${entity.id}`);
    const revision = revisionsById.get(entity.primaryFlagRevisionId);
    assert(revision, `Primary flag missing: ${entity.id}`);
    assert(
      revision.entityId === entity.id,
      `Flag/entity mismatch: ${entity.id}`
    );

    for (const name of [entity.displayNamePtBr, ...entity.aliasesPtBr]) {
      const key = normalize(name);
      const owner = aliases.get(key);
      assert(
        !owner || owner === entity.id,
        `Ambiguous normalized alias "${name}" shared by ${owner} and ${entity.id}`
      );
      aliases.set(key, entity.id);
    }
  }

  for (const revision of catalog.flagRevisions) {
    assert(
      !revisionIds.has(revision.id),
      `Duplicate flag revision: ${revision.id}`
    );
    revisionIds.add(revision.id);
    assert(
      revision.commons.fileTitle.startsWith("File:"),
      `Invalid Commons title: ${revision.id}`
    );
    assert(
      /^https:\/\/commons\.wikimedia\.org\//.test(
        revision.commons.descriptionUrl
      ),
      `Invalid Commons description URL: ${revision.id}`
    );
    assert(
      revision.commons.sha1.length === 40,
      `Invalid Commons SHA-1: ${revision.id}`
    );
    assert(revision.license.shortName, `Missing license: ${revision.id}`);
    const assetPath = join(
      process.cwd(),
      "public",
      revision.filePath.replace(/^\//, "")
    );
    const bytes = await readFile(assetPath);
    const sha1 = createHash("sha1").update(bytes).digest("hex");
    assert(
      sha1 === revision.commons.sha1,
      `Local asset hash mismatch: ${revision.id}`
    );
  }

  // Invertido em relação à lista de overrides que existia aqui: em vez de
  // conferir quatro desvios lembrados à mão, afirma a regra e nomeia a única
  // exceção. Um desvio novo passa a ser impossível de entrar sem editar isto.
  for (const revision of catalog.flagRevisions) {
    assert(
      revision.representationKind === "national",
      `Not a national flag: ${revision.entityId} (${revision.representationKind})`
    );
    assert(
      revision.officialStatus === "official",
      `Not an official flag: ${revision.entityId} (${revision.officialStatus})`
    );
  }
  const twoSided = catalog.flagRevisions
    .filter(({ side }) => side !== "same-both-sides")
    .map(({ entityId }) => entityId);
  assert(
    twoSided.join(",") === "pry",
    `Only Paraguay has distinct sides, found: ${twoSided.join(", ")}`
  );

  // Fecha a bijeção disco↔catálogo. O laço acima cobre catálogo→disco: lê
  // cada arquivo referenciado e confere o SHA-1, então uma entidade sem
  // bandeira falha ali. Faltava o outro sentido — um arquivo *a mais* em
  // `public/flags` passava despercebido, que é exatamente o resíduo que
  // encolher o catálogo deixa.
  const onDisk = new Set(await readdir(FLAGS_DIRECTORY));
  const referenced = new Set(
    catalog.flagRevisions.map(({ filePath }) => basename(filePath))
  );
  const orphans = [...onDisk].filter((file) => !referenced.has(file)).sort();
  assert(
    orphans.length === 0,
    `Flag files with no entity: ${orphans.join(", ")}`
  );

  // A atribuição saiu do site com a página `/creditos` e virou documento no
  // repositório. Derivado, não escrito: sem este check ele desatualizaria em
  // silêncio no primeiro `data:refresh` que reconferisse licenças.
  const attribution = await readFile(ATTRIBUTION_PATH, "utf8").catch(
    () => undefined
  );
  assert(
    attribution === buildAttributionMarkdown(catalog),
    "ATRIBUICOES.md está fora de sincronia com o catálogo; rode `pnpm data:attribution`"
  );

  // Geografia pela M49, sem exceção escrita à mão. `geographyFor` falha por
  // entidade sem código, código fora do snapshot ou código sem tradução, e
  // `indexM49` falha por código repetido. O cruzamento do ISO-3 é o que pega
  // um código M49 errado vindo da fonte: sem ele, o país herdaria em silêncio
  // a região de outro.
  const m49Index = indexM49(m49Json as M49Snapshot);
  const subregionCount = new Map<string, number>();
  for (const entity of catalog.entities) {
    // O cruzamento vem antes da tradução: um código trocado que caia numa
    // área sem região, como a Antártida, falharia na tradução com uma
    // mensagem que não diz que o código está errado.
    const area = m49Index.get(entity.identifiers.unM49 ?? "");
    assert(
      area?.iso3 === entity.identifiers.isoAlpha3,
      `Código M49 de ${entity.id} aponta para ${area?.iso3 ?? "nada"}, não para ${entity.identifiers.isoAlpha3 ?? "?"}`
    );
    const { subregion } = geographyFor(
      entity.id,
      entity.identifiers.unM49,
      m49Index
    );
    subregionCount.set(subregion, (subregionCount.get(subregion) ?? 0) + 1);
  }

  // O currículo é escrito à mão, e por isso é aqui que ele se confere contra
  // o catálogo: a ordem de cada continente é uma permutação das entidades
  // dele, e todo par nomeia duas entidades que existem, com razão e os dois
  // traços. Uma entidade esquecida na ordem nunca seria apresentada.
  const continentById = new Map(
    catalog.entities.map((entity) => [
      entity.id,
      geographyFor(entity.id, entity.identifiers.unM49, m49Index).continent
    ])
  );
  let curatedPairs = 0;
  for (const continent of CONTINENT_IDS) {
    const curriculum = CURRICULUM[continent];
    if (!curriculum) continue;
    const expected = catalog.entities
      .filter((entity) => continentById.get(entity.id) === continent)
      .map(({ id }) => id)
      .sort();
    assert(
      [...curriculum.order].sort().join(",") === expected.join(","),
      `A ordem do currículo de ${continent} não é uma permutação das ${expected.length} entidades do continente`
    );
    const keys = new Set<string>();
    for (const pair of curriculum.pairs) {
      const [first, second] = pair.entityIds;
      assert(
        continentById.has(first) && continentById.has(second),
        `Par com entidade fora do catálogo: ${first}, ${second}`
      );
      const key = pairStateId(first, second);
      assert(!keys.has(key), `Par repetido no currículo: ${key}`);
      keys.add(key);
      assert(pair.reason.trim() !== "", `Par sem razão: ${key}`);
      assert(
        Object.keys(pair.traits).sort().join(",") ===
          [first, second].sort().join(",") &&
          Object.values(pair.traits).every((trait) => trait.trim() !== ""),
        `Par sem os dois traços: ${key}`
      );
      curatedPairs += 1;
    }
    const undecided = undecidedConfusablePairs(
      continent,
      (runtimeCatalogJson as RuntimeCatalog).entities
    );
    assert(
      undecided.length === 0,
      `Pares confundíveis pela heurística sem decisão no currículo de ${continent}: ${undecided.join(", ")}. Cure o par ou registre a exceção em notConfusable.`
    );
  }

  console.log(
    `Catalog valid: ${catalog.entities.length} entities (${members.length} UN members, ${observers.length} observers), ${catalog.flagRevisions.length} verified local assets, ${subregionCount.size} M49 subregions, ${curatedPairs} curated pairs.`
  );
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
