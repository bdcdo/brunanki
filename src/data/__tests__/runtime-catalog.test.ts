import { describe, expect, it } from "vitest";

import catalogJson from "../catalog.json";
import runtimeJson from "../runtime-catalog.json";
import type { Catalog } from "@/types/catalog";

import { projectRuntimeCatalog } from "../project-runtime-catalog";

const catalog = catalogJson as Catalog;

describe("runtime-catalog.json", () => {
  it("está em sincronia com o catálogo completo", () => {
    // Guarda contra drift: editar catalog.json sem regerar o artefato de
    // runtime falha aqui, sem depender de rede nem do pipeline de refresh.
    expect(runtimeJson).toEqual(projectRuntimeCatalog(catalog));
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

  it("dá a todas as 220 entidades um caminho de bandeira", () => {
    const runtime = projectRuntimeCatalog(catalog);
    expect(runtime.entities).toHaveLength(220);
    for (const entity of runtime.entities) {
      expect(entity.flagPath).toMatch(/^\/flags\/[a-z-]+\.(svg|png)$/);
    }
  });

  it("é bem menor que o catálogo completo", () => {
    // O corte existe para tirar centenas de KB de JS de toda rota.
    const completo = JSON.stringify(catalogJson).length;
    const runtime = JSON.stringify(runtimeJson).length;
    expect(runtime).toBeLessThan(completo * 0.3);
  });
});
