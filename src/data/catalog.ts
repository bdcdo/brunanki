import catalogJson from "./catalog.json";
import creditsJson from "./credits.json";
import type { Catalog } from "@/types/catalog";

export const catalog = catalogJson as Catalog;
export const entities = catalog.entities;
export const flagRevisions = catalog.flagRevisions;
export const credits = creditsJson;

export const entityById = new Map(
  entities.map((entity) => [entity.id, entity])
);

export const flagByEntityId = new Map(
  flagRevisions.map((flag) => [flag.entityId, flag])
);
