import { describePalette } from "@/domain/palette";
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

interface FlagImageProps {
  entity: RuntimeEntity;
  alt: FlagAltText;
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
  eager = false,
  className = ""
}: FlagImageProps) {
  const text = flagAltText(entity, alt);

  return (
    <span className={`flag-frame ${className}`}>
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
