import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * O botão do app, em cinco variantes: a ação principal, o convite dentro de
 * painel de tinta, a secundária, a destrutiva e a fantasma.
 *
 * `min-h`, e não `h`: rótulos como "Agora, lembre sem alternativas" quebram em
 * duas linhas em tela estreita, e uma altura fixa os cortaria.
 *
 * A borda de 2px transparente vive na base, e não só na variante `secondary`,
 * para que ganhar borda visível não mude a altura do botão.
 */
const buttonVariants = cva(
  cn(
    "inline-flex min-h-12 items-center justify-center gap-[9px]",
    "rounded-control border-2 border-transparent px-[19px] py-3",
    // `cursor-pointer` não é enfeite: o preflight da v4 do Tailwind deixou de
    // aplicar `cursor: pointer` a <button> — foi mudança deliberada de lá —, e
    // a regra legada declarava o cursor à mão. Sem esta linha todo botão do
    // app passaria a apontar a seta de texto, o que nenhuma captura pega.
    "cursor-pointer font-bold no-underline transition",
    "disabled:cursor-not-allowed disabled:opacity-50 disabled:translate-y-0",
    // O mesmo aspecto para aria-disabled, que o botão usa quando precisa
    // continuar focável enquanto espera, como o Foi chute durante a gravação.
    "aria-disabled:cursor-not-allowed aria-disabled:opacity-50",
    "[&_svg]:shrink-0"
  ),
  {
    variants: {
      variant: {
        default:
          "bg-action text-action-on hover:bg-action-hover hover:-translate-y-px",
        // O convite dentro de painel de tinta, onde o `default` desapareceria
        // contra o próprio fundo. É o amarelo do XP, e só aparece ali.
        highlight:
          "bg-highlight text-ink hover:bg-highlight-hover hover:-translate-y-px",
        secondary:
          "border-line bg-surface text-ink hover:border-ink-soft hover:bg-white hover:-translate-y-px",
        // Exclusiva da ação irreversível. O convite de entrada e a destruição
        // de dados não podem ter o mesmo tratamento visual: a cor de alerta
        // fica reservada ao que não tem volta.
        destructive:
          "bg-alert text-alert-on hover:bg-alert-hover hover:-translate-y-px",
        ghost: "bg-transparent text-ink hover:bg-accent"
      },
      size: {
        default: "",
        sm: "min-h-10 px-3.5 py-2 text-sm"
      }
    },
    defaultVariants: { variant: "default", size: "default" }
  }
);

interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  // React 19: `ref` é prop normal de componente de função, sem forwardRef.
  ref?: React.Ref<HTMLButtonElement>;
}

function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Button, buttonVariants };
