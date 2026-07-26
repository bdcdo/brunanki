import { readFile } from "node:fs/promises";
import { join } from "node:path";

import {
  quantizeHex,
  sortPalette,
  type ColorNamePtBr
} from "../src/domain/palette";

/**
 * Cores declaradas num SVG, na ordem em que aparecem.
 *
 * Cobre `fill` e `stroke`, como atributo e dentro de `style`, mais
 * `stop-color` de gradiente. `stroke` é indispensável: as cruzes nórdicas e as
 * faixas da bandeira sul-africana são traçadas, não preenchidas — sem elas a
 * Dinamarca sairia só como "vermelho" e a Suécia só como "azul".
 *
 * Não é um parser de SVG, e sim uma varredura de declarações de cor, o que
 * basta porque bandeiras são figuras chapadas de poucas cores.
 */
export function extractSvgColors(source: string): ColorNamePtBr[] {
  const found: ColorNamePtBr[] = [];
  const patterns = [
    /\b(?:fill|stroke)\s*=\s*"([^"]+)"/gi,
    /\b(?:fill|stroke)\s*:\s*([^;"'}\s]+)/gi,
    /\bstop-color\s*[:=]\s*"?([^;"'}\s]+)/gi
  ];

  for (const pattern of patterns) {
    for (const [, raw] of source.matchAll(pattern)) {
      if (!raw || /^(none|url\(|currentcolor|transparent)/i.test(raw)) continue;
      const color = quantizeHex(raw);
      if (color) found.push(color);
    }
  }

  return sortPalette(found);
}

/**
 * Exceções editoriais, conferidas a olho.
 *
 * A varredura lê declarações de cor no texto do arquivo, então falha em dois
 * casos legítimos: bandeira que não é SVG, e bandeira cujo desenho depende da
 * cor padrão do SVG (preto) em vez de declará-la.
 */
const PALETTE_OVERRIDES: Readonly<Record<string, ColorNamePtBr[]>> = {
  // Arquivo PNG: não há declaração de cor a ler.
  vat: ["amarelo", "branco"],
  // Campo branco com a chahada em preto; os traços do texto não declaram
  // `fill` e herdam o preto padrão do SVG.
  afg: ["preto", "branco"]
};

export async function readPalettes(
  projectRoot: string,
  flagPathByEntityId: ReadonlyMap<string, string>
): Promise<Map<string, ColorNamePtBr[]>> {
  const palettes = new Map<string, ColorNamePtBr[]>();

  for (const [entityId, flagPath] of flagPathByEntityId) {
    const override = PALETTE_OVERRIDES[entityId];
    if (override) {
      palettes.set(entityId, override);
      continue;
    }

    const absolute = join(projectRoot, "public", flagPath.replace(/^\//, ""));
    const source = await readFile(absolute, "utf8");
    const palette = extractSvgColors(source);
    if (palette.length === 0) {
      throw new Error(
        `Nenhuma cor reconhecida em ${flagPath}; acrescente uma exceção em PALETTE_OVERRIDES`
      );
    }
    palettes.set(entityId, palette);
  }

  return palettes;
}
