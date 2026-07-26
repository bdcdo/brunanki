import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Como a alternativa se apresenta depois de respondida.
 *
 * `muted` é o estado das que não foram escolhidas nem eram a resposta: elas
 * continuam na tela — é isso que permite ver *onde* se errou —, mas recuam.
 */
export type OptionState = "idle" | "correct" | "wrong" | "muted";

/** `row` para alternativas de texto; `tile` para as de bandeira. */
export type OptionLayout = "row" | "tile";

const optionVariants = cva(
  cn(
    "cursor-pointer rounded-[14px] border-2 text-left font-bold transition",
    // Borda de repouso em --input (3,53:1), e não em --border (1,46:1): a
    // borda de uma alternativa delimita um controle e carrega informação, o
    // que a WCAG 1.4.11 põe num piso de 3:1. É a única falha de contraste do
    // desenho de referência.
    "border-input bg-white text-ink",
    // Sem whitespace-nowrap, e por isso este componente não é construído sobre
    // o Button: "República Democrática do Congo" numa Pixel 7 estouraria a
    // largura e derrubaria o gate de overflow.
    "aria-disabled:cursor-default"
  ),
  {
    variants: {
      layout: {
        row: "min-h-[70px] px-4 py-3.5",
        tile: "grid gap-2.5 p-2.5 text-center"
      },
      state: {
        idle: "hover:border-brand-ui",
        correct: "",
        wrong: "",
        muted: "opacity-55"
      }
    },
    compoundVariants: [
      // No `row` o conteúdo é texto, e o preenchimento total é legível.
      {
        layout: "row",
        state: "correct",
        class: "border-outcome-correct-line bg-outcome-correct"
      },
      {
        layout: "row",
        state: "wrong",
        class: "border-outcome-incorrect-line bg-outcome-incorrect"
      },
      // No `tile` o veredito é só borda e selo, nunca preenchimento. Inundar o
      // ladrilho de verde recoloriria o entorno da bandeira, competiria com as
      // cores dela e assentaria o xadrez de transparência sobre campo colorido
      // — corromperia o próprio estímulo que a pessoa precisa memorizar.
      {
        layout: "tile",
        state: "correct",
        class: "border-outcome-correct-line ring-2 ring-outcome-correct-line"
      },
      {
        layout: "tile",
        state: "wrong",
        class:
          "border-outcome-incorrect-line ring-2 ring-outcome-incorrect-line"
      }
    ],
    defaultVariants: { layout: "row", state: "idle" }
  }
);

interface OptionButtonProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "disabled"
> {
  layout?: OptionLayout;
  state?: OptionState;
  /**
   * Bloqueia o clique sem tirar o botão da ordem de tabulação.
   *
   * `aria-disabled`, e nunca `disabled`: o atributo nativo remove da ordem de
   * tabulação o elemento que a pessoa acabou de ativar, e o foco cai no
   * `<body>` exatamente no instante em que o veredito é anunciado. Com este,
   * o foco fica onde estava; a guarda de clique abaixo faz o que o `disabled`
   * daria de graça.
   */
  locked?: boolean;
}

export function OptionButton({
  layout,
  state,
  locked = false,
  className,
  onClick,
  ...props
}: OptionButtonProps) {
  return (
    <button
      type="button"
      aria-disabled={locked || undefined}
      onClick={(event) => {
        if (locked) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
      className={cn(optionVariants({ layout, state }), className)}
      {...props}
    />
  );
}
