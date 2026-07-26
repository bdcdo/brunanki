/**
 * Nomes de cor em pt-BR usados para descrever bandeiras.
 *
 * A lista é curta de propósito: serve para dizer "bandeira com verde, branco e
 * laranja" a quem usa leitor de tela e para medir semelhança entre bandeiras.
 * Distinções finas de tom atrapalhariam os dois usos — o que importa é que
 * Irlanda e Costa do Marfim caiam nos mesmos três nomes.
 */
export const COLOR_NAMES_PT_BR = [
  "vermelho",
  "laranja",
  "amarelo",
  "verde",
  "azul",
  "roxo",
  "rosa",
  "marrom",
  "preto",
  "branco",
  "cinza"
] as const;

export type ColorNamePtBr = (typeof COLOR_NAMES_PT_BR)[number];

/** Cores CSS nomeadas que aparecem nos SVGs do catálogo. */
const NAMED_CSS_COLORS: Readonly<Record<string, string>> = {
  red: "#ff0000",
  green: "#008000",
  blue: "#0000ff",
  yellow: "#ffff00",
  white: "#ffffff",
  black: "#000000",
  gray: "#808080",
  grey: "#808080",
  orange: "#ffa500",
  purple: "#800080",
  maroon: "#800000",
  navy: "#000080",
  gold: "#ffd700",
  silver: "#c0c0c0"
};

function expandHex(hex: string): string | undefined {
  const value = hex.trim().toLowerCase().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/.test(value)) {
    return value
      .split("")
      .map((char) => char + char)
      .join("");
  }
  if (/^[0-9a-f]{6}$/.test(value)) return value;
  if (/^[0-9a-f]{8}$/.test(value)) return value.slice(0, 6);
  return undefined;
}

interface Hsl {
  hue: number;
  saturation: number;
  lightness: number;
}

function toHsl(red: number, green: number, blue: number): Hsl {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const lightness = (max + min) / 2;

  if (delta === 0) return { hue: 0, saturation: 0, lightness };

  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  let hue: number;
  if (max === r) hue = ((g - b) / delta) % 6;
  else if (max === g) hue = (b - r) / delta + 2;
  else hue = (r - g) / delta + 4;
  hue *= 60;
  if (hue < 0) hue += 360;

  return { hue, saturation, lightness };
}

/**
 * Reduz uma cor a um dos nomes acima.
 *
 * A ordem dos testes importa: acromáticos (preto, branco, cinza) saem antes
 * pela luminosidade e pela saturação, porque um vermelho quase preto deve ser
 * "preto", não "vermelho". Marrom é tratado como laranja escuro — não tem
 * faixa de matiz própria.
 */
export function quantizeHex(input: string): ColorNamePtBr | undefined {
  const named = NAMED_CSS_COLORS[input.trim().toLowerCase()];
  const hex = expandHex(named ?? input);
  if (!hex) return undefined;

  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  const { hue, saturation, lightness } = toHsl(red, green, blue);

  if (lightness >= 0.92) return "branco";
  if (lightness <= 0.12) return "preto";
  if (saturation <= 0.12) {
    if (lightness >= 0.85) return "branco";
    if (lightness <= 0.2) return "preto";
    return "cinza";
  }

  if (hue < 15 || hue >= 345) return "vermelho";
  if (hue < 45) return lightness <= 0.35 ? "marrom" : "laranja";
  if (hue < 70) return "amarelo";
  if (hue < 170) return "verde";
  if (hue < 255) return "azul";
  if (hue < 290) return "roxo";
  if (hue < 345) return lightness >= 0.6 ? "rosa" : "roxo";
  return "vermelho";
}

/** Ordena pela lista canônica, para que a descrição seja estável. */
export function sortPalette(colors: Iterable<ColorNamePtBr>): ColorNamePtBr[] {
  return [...new Set(colors)].sort(
    (left, right) =>
      COLOR_NAMES_PT_BR.indexOf(left) - COLOR_NAMES_PT_BR.indexOf(right)
  );
}

/** "verde, branco e laranja" */
export function describePalette(colors: readonly ColorNamePtBr[]): string {
  if (colors.length === 0) return "cores indefinidas";
  if (colors.length === 1) return colors[0];
  return `${colors.slice(0, -1).join(", ")} e ${colors[colors.length - 1]}`;
}

/**
 * Semelhança de Jaccard entre duas paletas, em [0, 1].
 *
 * É a medida de confundibilidade visual usada para escolher distratores:
 * Irlanda e Costa do Marfim têm exatamente as mesmas três cores e dão 1.
 */
export function paletteSimilarity(
  left: readonly ColorNamePtBr[],
  right: readonly ColorNamePtBr[]
): number {
  if (left.length === 0 || right.length === 0) return 0;
  const a = new Set(left);
  const b = new Set(right);
  let intersection = 0;
  for (const color of a) if (b.has(color)) intersection += 1;
  return intersection / (a.size + b.size - intersection);
}
