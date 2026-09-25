import { describe, expect, it } from "vitest";

import catalogJson from "../catalog.json";
import runtimeJson from "../runtime-catalog.json";
import m49Json from "../../../scripts/sources/m49.json";
import type { M49Snapshot } from "@/data/m49";
import {
  CONTINENT_IDS,
  SUBREGION,
  SUBREGION_IDS,
  type SubregionId
} from "@/types/geography";
import type { Catalog } from "@/types/catalog";
import type { ColorNamePtBr } from "@/domain/palette";

import { projectRuntimeCatalog } from "../project-runtime-catalog";

const catalog = catalogJson as Catalog;
const m49 = m49Json as M49Snapshot;

/** Reaproveita as paletas já gravadas no artefato para comparar a projeção. */
const palettes = new Map(
  runtimeJson.entities.map((entity) => [
    entity.id,
    entity.palette as ColorNamePtBr[]
  ])
);

describe("runtime-catalog.json", () => {
  it("está em sincronia com o catálogo completo", () => {
    // Guarda contra drift: editar catalog.json sem regerar o artefato de
    // runtime falha aqui, sem depender de rede nem do pipeline de refresh.
    expect(runtimeJson).toEqual(projectRuntimeCatalog(catalog, palettes, m49));
  });

  it("não leva procedência nem licença ao navegador", () => {
    const serialized = JSON.stringify(runtimeJson);
    for (const vazado of [
      "attributionRequired",
      "sha1",
      "originalUrl",
      "descriptionUrl",
      "wikidataQid",
      "unM49"
    ]) {
      expect(serialized).not.toContain(vazado);
    }
  });

  it("dá a toda entidade um caminho de bandeira", () => {
    const runtime = projectRuntimeCatalog(catalog, palettes, m49);
    expect(runtime.entities).toHaveLength(catalog.entities.length);
    for (const entity of runtime.entities) {
      expect(entity.flagPath).toMatch(/^\/flags\/[a-z-]+\.(svg|png)$/);
      // Paleta vazia quebraria tanto a escolha de distratores quanto a
      // descrição para leitor de tela.
      expect(entity.palette.length).toBeGreaterThan(0);
    }
  });

  it("grava só IDs de geografia, coerentes entre si, e nunca o rótulo", () => {
    // O ID é o que o progresso guarda; se o rótulo fosse gravado, rever uma
    // tradução mudaria o dado e invalidaria backups.
    for (const entity of runtimeJson.entities) {
      expect(CONTINENT_IDS).toContain(entity.continent);
      expect(SUBREGION_IDS).toContain(entity.subregion);
      expect(SUBREGION[entity.subregion as SubregionId].continent).toBe(
        entity.continent
      );
    }
    expect(JSON.stringify(runtimeJson)).not.toContain("América Setentrional");
  });

  it("é bem menor que o catálogo completo", () => {
    // O corte existe para tirar centenas de KB de JS de toda rota.
    const completo = JSON.stringify(catalogJson).length;
    const runtime = JSON.stringify(runtimeJson).length;
    expect(runtime).toBeLessThan(completo * 0.3);
  });
});
