import { FlagImage } from "@/components/FlagImage";
import type { RuntimeEntity } from "@/types/runtime-catalog";

/**
 * O momento em que a bandeira passa a dominada: a figurinha colada no álbum.
 *
 * Mora dentro do painel do veredito, e não numa região viva própria: duas
 * regiões montadas no mesmo instante, já com texto, disputam o anúncio, e a
 * que surge com texto costuma nem ser lida. O texto não diz por que a
 * bandeira passou, porque o critério é do domínio e transcrevê-lo aqui criaria
 * uma segunda versão dele.
 */
export function StickerMoment({ entity }: { entity: RuntimeEntity }) {
  return (
    <span className="mt-3 flex items-center gap-4 rounded-[10px] bg-surface p-3">
      <span
        data-testid="sticker"
        className="block w-20 shrink-0 -rotate-2 rounded-[6px] bg-surface p-1.5 shadow-sticker ring-1 ring-line motion-safe:animate-sticker-press"
      >
        <FlagImage entity={entity} alt={{ kind: "decorative" }} size="fill" />
      </span>
      <span>
        <strong className="block font-title text-2xl leading-name font-extrabold tracking-title">
          Figurinha colada
        </strong>
        {/* Sem concordância com o nome: "Estados Unidos", "Bahamas" e
            "Peru" pediriam gêneros e números diferentes. */}
        Bandeira dominada: {entity.displayNamePtBr}.
      </span>
    </span>
  );
}
