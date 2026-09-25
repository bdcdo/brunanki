import { describePalette } from "@/domain/palette";
import { cn } from "@/lib/utils";
import type { RuntimeEntity } from "@/types/runtime-catalog";

/**
 * Como a bandeira deve ser anunciada a quem usa leitor de tela.
 *
 * É obrigatório e não tem valor padrão de propósito: o texto certo depende do
 * exercício, e um default silencioso foi justamente o que deixou as quatro
 * alternativas do exercício inverso com o mesmo texto — indistinguíveis para
 * quem não vê a imagem.
 */
export type FlagAltText =
  /** Fora de exercício: "Bandeira do Brasil". */
  | { kind: "named" }
  /** Em exercício: descreve sem entregar a resposta. */
  | { kind: "unnamed" }
  /** O elemento que contém a imagem já carrega o rótulo. */
  | { kind: "decorative" };

/**
 * Como o quadro ocupa espaço. Obrigatório e sem valor padrão, pelo mesmo
 * argumento que o `alt` acima já usava: um padrão silencioso foi o que deixou
 * o defeito passar. Ali era o texto alternativo; aqui era a altura — as três
 * bandeiras da abertura do diagnóstico não declaravam nenhuma e renderizavam
 * como traços de 2px.
 *
 * São três, e não um nome por chamador, porque só existem três comportamentos:
 * o quadro grande e centrado do exercício, o que se encaixa na moldura de um
 * cartão de catálogo, e o que preenche o contêiner na proporção padrão. Nomes
 * a mais para o mesmo comportamento seriam decoração.
 */
export type FlagSize = "hero" | "card" | "fill";

const frameSize: Record<FlagSize, string> = {
  // A bandeira sob exame. Altura explícita vence o aspect-ratio da classe,
  // que é o que se quer: aqui o limite é a viewport, não a proporção.
  hero: "mx-auto mb-7 min-h-[210px] w-[min(520px,100%)] h-[min(330px,44vw)] max-md:h-[230px]",
  // Encaixada no cartão do catálogo: a moldura e o raio são do cartão, e o
  // quadro contribui só com a linha que separa a bandeira do rótulo. Zerar os
  // lados em vez de usar `border-0` evita disputa entre dois utilitários de
  // largura de borda, cuja ordem de emissão não é garantida.
  card: "w-full rounded-none border-x-0 border-t-0 border-b-line",
  fill: "w-full"
};

interface FlagImageProps {
  entity: RuntimeEntity;
  alt: FlagAltText;
  size: FlagSize;
  eager?: boolean;
  className?: string;
}

export function flagAltText(entity: RuntimeEntity, alt: FlagAltText): string {
  switch (alt.kind) {
    case "named":
      return `Bandeira de ${entity.displayNamePtBr}`;
    case "unnamed":
      return `Bandeira com ${describePalette(entity.palette)}`;
    case "decorative":
      return "";
  }
}

export function FlagImage({
  entity,
  alt,
  size,
  eager = false,
  className
}: FlagImageProps) {
  const text = flagAltText(entity, alt);

  return (
    <span className={cn("flag-frame", frameSize[size], className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        // `flagPath` é obrigatório em RuntimeEntity, então não há caminho
        // adivinhado a partir do id: uma entidade sem bandeira não chega aqui.
        src={entity.flagPath}
        alt={text}
        {...(text === "" ? { role: "presentation" } : {})}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
      />
    </span>
  );
}
