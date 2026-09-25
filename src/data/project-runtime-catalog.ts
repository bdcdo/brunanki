import type { ColorNamePtBr } from "@/domain/palette";
import { geographyFor, indexM49, type M49Snapshot } from "@/data/m49";
import type { Catalog } from "@/types/catalog";
import type { RuntimeCatalog, RuntimeEntity } from "@/types/runtime-catalog";

/**
 * Projeta o catálogo completo no subconjunto que vai para o navegador.
 *
 * A geografia entra aqui, pelo código M49 que o catálogo já guarda, e não
 * pelo campo `region` do catálogo completo: aquele vinha do restcountries,
 * que discorda da ONU em casos como Chipre (Europa lá, Ásia Ocidental aqui) e
 * não tem as regiões intermediárias que partem as Américas.
 *
 * Função pura e sem I/O de propósito: o artefato versionado
 * `runtime-catalog.json` é gerado por ela, e um teste compara os dois para
 * que uma edição em `catalog.json` sem regeneração falhe em `pnpm test`, sem
 * depender de rede nem do pipeline de refresh.
 */
export function projectRuntimeCatalog(
  catalog: Catalog,
  paletteByEntityId: ReadonlyMap<string, readonly ColorNamePtBr[]>,
  m49: M49Snapshot
): RuntimeCatalog {
  const m49Index = indexM49(m49);
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
      ...geographyFor(entity.id, entity.identifiers.unM49, m49Index),
      flagPath: flag.filePath,
      palette,
      ...(entity.editorialNote ? { editorialNote: entity.editorialNote } : {})
    };
  });

  return { version: catalog.version, entities };
}
