import { cn } from "@/lib/utils";

/**
 * Um bloco de tinta invertido, com rabicho apontando para o que ele comenta.
 *
 * A geometria diz "outra voz" — algo que não é o cromo da interface. No Ptanki
 * quem fala é a nota editorial do catálogo, que existe em 4 das 220 entidades
 * e hoje só aparece na página de detalhe, portanto nunca é vista por quem está
 * aprendendo. São exatamente os casos em que a pessoa tem direito a saber por
 * que a bandeira é aquela: Taiwan, Santa Sé, Irlanda do Norte e o anverso do
 * Paraguai.
 *
 * Fica **no fluxo**, e não posicionado de forma absoluta com `width:
 * max-content` como na referência. O motivo tem número: a nota da Irlanda do
 * Norte tem 183 caracteres, e `max-content` estouraria garantidamente os 412px
 * de uma Pixel 7. Como a nota está em 1,8% das entidades, a chance de um teste
 * cair nela é quase nula — então o defeito precisa ser impossível por
 * construção, não vigiado.
 *
 * Sem truncar: truncar a nota que desfaz a ambiguidade institucional do Ulster
 * Banner anularia a razão de ela existir. E `return null` sem reservar espaço,
 * porque reservar altura deixaria 98% das telas com um buraco.
 *
 * Fonte de corpo, não de título: aqui é prosa para ler uma vez, e a Atkinson
 * Hyperlegible foi escolhida por legibilidade.
 */
export function InkBubble({
  children,
  className
}: {
  children?: string;
  className?: string;
}) {
  if (!children) return null;

  return (
    <div className={cn("flex justify-center", className)}>
      <div className="relative max-w-[min(46ch,100%)]">
        {/* O rabicho, apontando para cima. Um quadrado girado, e não uma borda
            triangular: assim ele herda a mesma cor de fundo do balão e some se
            a cor mudar num lugar só. */}
        <span
          aria-hidden="true"
          className="absolute -top-1 left-1/2 size-3 -translate-x-1/2 rotate-45 rounded-[2px] bg-ink"
        />
        <p className="relative rounded-panel bg-ink px-5 py-3.5 text-sm text-on-ink">
          {children}
        </p>
      </div>
    </div>
  );
}
