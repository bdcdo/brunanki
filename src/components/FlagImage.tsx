import type { LearningEntity } from "@/types/catalog";
import { flagByEntityId } from "@/data/catalog";

interface FlagImageProps {
  entity: LearningEntity;
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
  const flag = flagByEntityId.get(entity.id);

  return (
    <span className={`flag-frame ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={flag?.filePath ?? `/flags/${entity.id}.svg`}
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
