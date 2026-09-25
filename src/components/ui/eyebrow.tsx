import { cn } from "@/lib/utils";

/**
 * O rótulo curto que abre uma seção, um cartão ou um passo de exercício. Em
 * caixa de frase, e não em caixa alta espaçada: no álbum ele é uma legenda
 * que se lê, não um carimbo.
 *
 * É componente porque a cor é a decisão de contraste do app que se mede em
 * texto pequeno, e ela precisa de um lugar só: `--brand-deep` (7,03:1 sobre o
 * papel), e não `--brand` (5,33:1), pela folga barata.
 *
 * `leading-body` explícito porque `text-sm` traz o 1,5 do corpo só por
 * coincidência de token; no `<dt>` do resumo de sessão a entrelinha decide a
 * altura da linha, e fixá-la aqui evita descobrir onde ela mudou.
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
