// O catálogo completo carrega procedência — identificadores externos, URLs de
// origem, hashes, licenças — que nenhuma tela de estudo usa. `server-only` faz
// o build quebrar se um componente de cliente importar este módulo, em vez de
// deixar 400 KB voltarem ao bundle sem ninguém perceber. Para o cliente, use
// `@/data/runtime-catalog`.
import "server-only";

import catalogJson from "./catalog.json";
import type { Catalog } from "@/types/catalog";

export const catalog = catalogJson as Catalog;
export const entities = catalog.entities;
export const flagRevisions = catalog.flagRevisions;

export const entityById = new Map(
  entities.map((entity) => [entity.id, entity])
);

export const flagByEntityId = new Map(
  flagRevisions.map((flag) => [flag.entityId, flag])
);
