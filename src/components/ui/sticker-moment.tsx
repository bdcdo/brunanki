import { FlagImage } from "@/components/FlagImage";
import type { RuntimeEntity } from "@/types/runtime-catalog";

/**
 * O momento em que a bandeira passa a dominada: a figurinha colada no álbum.
 *
 * Aparece uma vez, na resposta que fez a bandeira passar a dominada, e o
 * texto não diz por que ela passou: o critério é do domínio, e transcrevê-lo
 * aqui criaria uma segunda versão dele. `role="status"` porque é notícia
 * sobre a resposta que acabou de ser dada, e não um alerta.
 */
export function StickerMoment({ entity }: { entity: RuntimeEntity }) {
  return (
    <div
      role="status"
      className="mt-5 flex items-center gap-4 rounded-[14px] border-2 border-dashed border-brand bg-surface p-4"
    >
      <span
        data-testid="sticker"
        className="block w-24 shrink-0 -rotate-2 rounded-[6px] bg-surface p-1.5 shadow-sticker ring-1 ring-line motion-safe:animate-sticker-press"
      >
        <FlagImage entity={entity} alt={{ kind: "decorative" }} size="fill" />
      </span>
      <p className="m-0">
        <strong className="block font-title text-2xl leading-name font-extrabold tracking-title">
          Figurinha colada
        </strong>
        {entity.displayNamePtBr} entrou para o álbum.
      </p>
    </div>
  );
}
