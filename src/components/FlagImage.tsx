import type { RuntimeEntity } from "@/types/runtime-catalog";

interface FlagImageProps {
  entity: RuntimeEntity;
  revealName?: boolean;
  eager?: boolean;
  className?: string;
}

export function FlagImage({
  entity,
  revealName = false,
  eager = false,
  className = ""
}: FlagImageProps) {
  return (
    <span className={`flag-frame ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        // `flagPath` é obrigatório em RuntimeEntity, então não há caminho
        // adivinhado a partir do id: uma entidade sem bandeira não chega aqui.
        src={entity.flagPath}
        alt={
          revealName
            ? `Bandeira de ${entity.displayNamePtBr}`
            : "Bandeira a identificar"
        }
        loading={eager ? "eager" : "lazy"}
        decoding="async"
      />
    </span>
  );
}
