import { describe, expect, it } from "vitest";

import catalogJson from "../catalog.json";
import runtimeJson from "../runtime-catalog.json";
import type { Catalog } from "@/types/catalog";
import type { ColorNamePtBr } from "@/domain/palette";

import { projectRuntimeCatalog } from "../project-runtime-catalog";

const catalog = catalogJson as Catalog;

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
    expect(runtimeJson).toEqual(projectRuntimeCatalog(catalog, palettes));
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
    const runtime = projectRuntimeCatalog(catalog, palettes);
    expect(runtime.entities).toHaveLength(catalog.entities.length);
    for (const entity of runtime.entities) {
      expect(entity.flagPath).toMatch(/^\/flags\/[a-z-]+\.(svg|png)$/);
      // Paleta vazia quebraria tanto a escolha de distratores quanto a
      // descrição para leitor de tela.
      expect(entity.palette.length).toBeGreaterThan(0);
    }
  });

  it("é bem menor que o catálogo completo", () => {
    // O corte existe para tirar centenas de KB de JS de toda rota.
    const completo = JSON.stringify(catalogJson).length;
    const runtime = JSON.stringify(runtimeJson).length;
    expect(runtime).toBeLessThan(completo * 0.3);
  });
});
