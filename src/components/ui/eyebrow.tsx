import { cn } from "@/lib/utils";

/**
 * O rótulo curto que abre uma seção, um cartão ou um passo de exercício. Em
 * caixa de frase, e não em caixa alta espaçada: no álbum ele é uma legenda
 * que se lê, não um carimbo. Onze arquivos o usam, e é por isso que ele é um componente e não
 * seis utilitários repetidos em cada chamada: a cor é a única decisão de
 * contraste do app que se mede em texto de 12px, e ela precisa de um lugar só.
 *
 * `--brand-deep` (7,03:1 sobre o papel), e não `--brand` (5,33:1): o
 * consumidor real é texto de 12px sobre papel, e a folga maior é barata.
 *
 * `leading-body` explícito porque `text-2xs` traz o 1,35 de `--lead-label`
 * junto com o tamanho, e a regra legada não declarava entrelinha nenhuma:
 * herdava o 1,5 do corpo. Num `<span>` inline a diferença não aparece — o
 * strut do bloco pai é maior que as duas —, mas no `<dt>` do resumo de sessão
 * aparece, e preservar é mais barato do que descobrir onde.
 */
export function Eyebrow({
  as: Tag = "span",
  className,
  ...props
}: React.HTMLAttributes<HTMLElement> & { as?: "span" | "dt" }) {
  return (
    <Tag
      className={cn(
        "text-sm leading-body font-bold text-brand-deep",
        className
      )}
      {...props}
    />
  );
}
