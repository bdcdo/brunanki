import type { ColorNamePtBr } from "@/domain/palette";
import type { Catalog } from "@/types/catalog";
import type { RuntimeCatalog, RuntimeEntity } from "@/types/runtime-catalog";

/**
 * Projeta o catálogo completo no subconjunto que vai para o navegador.
 *
 * Função pura e sem I/O de propósito: o artefato versionado
 * `runtime-catalog.json` é gerado por ela, e um teste compara os dois para
 * que uma edição em `catalog.json` sem regeneração falhe em `pnpm test`, sem
 * depender de rede nem do pipeline de refresh.
 */
export function projectRuntimeCatalog(
  catalog: Catalog,
  paletteByEntityId: ReadonlyMap<string, readonly ColorNamePtBr[]>
): RuntimeCatalog {
  const flagByEntityId = new Map(
    catalog.flagRevisions.map((flag) => [flag.entityId, flag])
  );

  const entities: RuntimeEntity[] = catalog.entities.map((entity) => {
    const flag = flagByEntityId.get(entity.id);
    if (!flag) {
      throw new Error(`Entidade sem bandeira no catálogo: ${entity.id}`);
    }
    const palette = paletteByEntityId.get(entity.id);
    if (!palette || palette.length === 0) {
      throw new Error(`Entidade sem paleta: ${entity.id}`);
    }
    return {
      id: entity.id,
      displayNamePtBr: entity.displayNamePtBr,
      aliasesPtBr: entity.aliasesPtBr,
      region: entity.region,
      // Só a organização interessa ao filtro do catálogo; status, fonte e data
      // de verificação ficam no artefato completo.
      organizations: [
        ...new Set(entity.memberships.map(({ organization }) => organization))
      ].sort(),
      flagPath: flag.filePath,
      palette,
      ...(entity.editorialNote ? { editorialNote: entity.editorialNote } : {})
    };
  });

  return { version: catalog.version, entities };
}
