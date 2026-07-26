import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Absorve as quatro superfícies retangulares do CSS legado — `.card`,
 * `.stat-card`, `.study-card` e `.settings-card` — mais a moldura de
 * `.flag-card`.
 *
 * `default` usa a superfície translúcida a 90% que o legado aplica em `.card`
 * e `.stat-card`: o papel milimetrado do fundo aparece por baixo, de leve, e é
 * ele que dá a textura da página.
 */
const cardVariants = cva("border text-card-foreground", {
  variants: {
    variant: {
      default: "rounded-card border-line bg-card/90 shadow-card",
      // Superfície de destaque: raio maior, sombra alta e fundo opaco. É o
      // cartão de sessão e o painel da meta do dia.
      panel: "rounded-panel border-line bg-card shadow-panel",
      // Cartão clicável do catálogo. O levantar de 3px no hover é o único
      // movimento de lista do app, e sobrevive porque comunica que o cartão
      // inteiro é o alvo, não só o nome.
      link: cn(
        "overflow-hidden rounded-card border-line bg-card shadow-card",
        "transition hover:-translate-y-[3px] hover:shadow-card-lifted"
      )
    },
    padding: {
      none: "",
      sm: "p-5",
      default: "p-6",
      lg: "p-[clamp(22px,4vw,46px)]"
    }
  },
  defaultVariants: { variant: "default", padding: "default" }
});

function Card({
  className,
  variant,
  padding,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof cardVariants>) {
  return (
    <div
      className={cn(cardVariants({ variant, padding }), className)}
      {...props}
    />
  );
}

/**
 * Divergência deliberada do upstream do shadcn, que compõe o cabeçalho em
 * coluna: aqui ele reproduz `.section-heading`, que é uma linha com o título à
 * esquerda e um link ou uma pílula à direita — a forma que a home e a tela de
 * progresso já usam.
 */
function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mb-4 flex items-center justify-between gap-4", className)}
      {...props}
    />
  );
}

/**
 * `<h2>` de verdade, e não o `<div>` do upstream: os títulos de cartão do app
 * são todos h2, e rebaixá-los a div quebraria a ordem de cabeçalhos que o axe
 * verifica.
 */
function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn(
        // `leading-body` porque `text-3xl` traz o 1,25 de `--lead-name` junto
        // com os 28px, e a regra legada não declarava entrelinha: herdava o
        // 1,5 do corpo. Num <h2> de bloco isso vale sete pixels de altura.
        "font-title text-3xl leading-body tracking-heading",
        className
      )}
      {...props}
    />
  );
}

function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("max-w-copy text-muted-foreground", className)}
      {...props}
    />
  );
}

/**
 * A superfície de um passo de sessão — o cartão de `/estudar` e `/diagnostico`,
 * mais as telas de abertura, resumo e estado vazio que compartilham a moldura.
 *
 * É o `panel` com um piso de altura, e o piso é o ponto: sem ele o cartão muda
 * de tamanho a cada passo — apresentação, alternativas, digitação, veredito —
 * e a bandeira, que é o artefato a memorizar, salta de posição no meio da
 * sessão.
 *
 * Em coluna única a folga horizontal aperta para 18px. O `clamp` do `padding`
 * `lg` chega a 22px numa Pixel 7, e quatro pixels de cada lado é o que separa
 * uma bandeira legível de uma bandeira estreita.
 */
const sessionCard = cn(
  cardVariants({ variant: "panel", padding: "lg" }),
  "min-h-[580px] max-md:min-h-[520px] max-md:px-[18px]"
);

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  cardVariants,
  sessionCard
};
