import type { RuntimeCatalog } from "@/types/runtime-catalog";

import runtimeJson from "./runtime-catalog.json";

/**
 * O catálogo como o navegador o vê.
 *
 * Gerado por `pnpm data:runtime` a partir de `catalog.json`, com a projeção de
 * `project-runtime-catalog.ts`. Toda tela de cliente deve importar daqui; o
 * catálogo completo é `@/data/catalog`, marcado com `server-only`.
 */
export const runtimeCatalog = runtimeJson as RuntimeCatalog;
export const entities = runtimeCatalog.entities;

export const entityById = new Map(
  entities.map((entity) => [entity.id, entity])
);
