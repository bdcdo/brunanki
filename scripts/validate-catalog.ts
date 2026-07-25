import {createHash} from "node:crypto";
import {access, readFile} from "node:fs/promises";
import {join} from "node:path";
import catalogJson from "../src/data/catalog.json";
import type {Catalog} from "../src/types/catalog";

const catalog = catalogJson as Catalog;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

async function main(): Promise<void> {
  assert(catalog.entities.length === 220, "Catalog must contain 220 entities");
  assert(
    catalog.entities.filter(({memberships}) =>
      memberships.some(
        ({organization, status}) =>
          organization === "UN" && status === "member",
      ),
    ).length === 193,
    "Catalog must contain 193 UN members",
  );
  assert(
    catalog.entities.filter(({memberships}) =>
      memberships.some(({organization}) => organization === "FIFA"),
    ).length === 211,
    "Catalog must contain 211 FIFA members",
  );
  assert(
    catalog.entities.some(
      ({id, memberships}) =>
        id === "vat" &&
        memberships.some(
          ({organization, status}) =>
            organization === "UN" && status === "observer",
        ),
    ),
    "Holy See/Vatican observer entry is missing",
  );
  assert(
    catalog.flagRevisions.length === catalog.entities.length,
    "Every entity must have exactly one primary flag revision",
  );

  const ids = new Set<string>();
  const revisionIds = new Set<string>();
  const aliases = new Map<string, string>();
  const revisionsById = new Map(
    catalog.flagRevisions.map((revision) => [revision.id, revision]),
  );

  for (const entity of catalog.entities) {
    assert(!ids.has(entity.id), `Duplicate entity ID: ${entity.id}`);
    ids.add(entity.id);
    assert(/^Q\d+$/.test(entity.identifiers.wikidataQid), `Invalid QID: ${entity.id}`);
    assert(entity.memberships.length > 0, `No membership: ${entity.id}`);
    const revision = revisionsById.get(entity.primaryFlagRevisionId);
    assert(revision, `Primary flag missing: ${entity.id}`);
    assert(revision.entityId === entity.id, `Flag/entity mismatch: ${entity.id}`);

    for (const name of [entity.displayNamePtBr, ...entity.aliasesPtBr]) {
      const key = normalize(name);
      const owner = aliases.get(key);
      assert(
        !owner || owner === entity.id,
        `Ambiguous normalized alias "${name}" shared by ${owner} and ${entity.id}`,
      );
      aliases.set(key, entity.id);
    }
  }

  for (const revision of catalog.flagRevisions) {
    assert(!revisionIds.has(revision.id), `Duplicate flag revision: ${revision.id}`);
    revisionIds.add(revision.id);
    assert(revision.commons.fileTitle.startsWith("File:"), `Invalid Commons title: ${revision.id}`);
    assert(/^https:\/\/commons\.wikimedia\.org\//.test(revision.commons.descriptionUrl), `Invalid Commons description URL: ${revision.id}`);
    assert(revision.commons.sha1.length === 40, `Invalid Commons SHA-1: ${revision.id}`);
    assert(revision.license.shortName, `Missing license: ${revision.id}`);
    const assetPath = join(process.cwd(), "public", revision.filePath.replace(/^\//, ""));
    await access(assetPath);
    const bytes = await readFile(assetPath);
    const sha1 = createHash("sha1").update(bytes).digest("hex");
    assert(sha1 === revision.commons.sha1, `Local asset hash mismatch: ${revision.id}`);
  }

  const overrides = {
    "northern-ireland": [
      "Ulster Banner.svg",
      "commonly-used",
      "same-both-sides",
    ],
    pry: ["Flag of Paraguay.svg", "official", "obverse"],
    twn: ["Flag of the Republic of China.svg", "official", "same-both-sides"],
    vat: ["Flag of Vatican City", "official", "same-both-sides"],
  } as const;
  for (const [entityId, expected] of Object.entries(overrides)) {
    const revision = catalog.flagRevisions.find(({entityId: id}) => id === entityId);
    assert(revision, `Editorial override missing: ${entityId}`);
    assert(
      revision.commons.fileTitle.includes(expected[0]),
      `Unexpected flag override for ${entityId}: ${revision.commons.fileTitle}`,
    );
    assert(revision.officialStatus === expected[1], `Unexpected status for ${entityId}`);
    assert(revision.side === expected[2], `Unexpected side for ${entityId}`);
  }

  console.log(
    `Catalog valid: ${catalog.entities.length} entities, 193 UN members, 211 FIFA members, ${catalog.flagRevisions.length} verified local assets.`,
  );
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
