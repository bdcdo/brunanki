/**
 * Gera src/data/runtime-catalog.json a partir de src/data/catalog.json.
 *
 * O artefato é versionado, como o próprio catálogo. Rode depois de qualquer
 * mudança no catálogo; `pnpm test` falha se os dois saírem de sincronia.
 */
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { Catalog } from "../src/types/catalog";
import { projectRuntimeCatalog } from "../src/data/project-runtime-catalog";

const dataDir = join(import.meta.dirname, "..", "src", "data");

async function main(): Promise<void> {
  const catalog = JSON.parse(
    await readFile(join(dataDir, "catalog.json"), "utf8")
  ) as Catalog;

  const runtime = projectRuntimeCatalog(catalog);
  await writeFile(
    join(dataDir, "runtime-catalog.json"),
    `${JSON.stringify(runtime, null, 2)}\n`,
    "utf8"
  );

  console.log(
    `runtime-catalog.json gerado com ${runtime.entities.length} entidades.`
  );
}

void main();
