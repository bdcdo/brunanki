import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Absorve `.button` e as quatro variantes que o CSS legado declara por classe
 * adicional: `.button-secondary`, `.button-coral`, `.button-ghost` e
 * `.icon-button`.
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
    "[&_svg]:shrink-0"
  ),
  {
    variants: {
      variant: {
        default:
          "bg-brand text-brand-on hover:bg-brand-deep hover:-translate-y-px",
        secondary:
          "border-line bg-surface text-ink hover:border-ink-soft hover:bg-white hover:-translate-y-px",
        // Exclusiva da ação irreversível. O CSS legado usa `.button-coral`
        // tanto em "Começar diagnóstico" quanto em "Apagar progresso", ou
        // seja, dá ao convite de entrada e à destruição de dados o mesmo
        // tratamento visual. Aqui os dois se separam: os convites são
        // `default`, e o coral fica reservado ao que não tem volta.
        destructive:
          "bg-alert text-alert-on hover:bg-[#963625] hover:-translate-y-px",
        ghost: "bg-transparent text-ink hover:bg-accent"
      },
      size: {
        default: "",
        sm: "min-h-10 px-3.5 py-2 text-sm",
        // O quadrado do menu: alvo de toque de 44px, borda de 1px e raio
        // menor. É a única variante que abre mão da moldura de 2px, porque
        // não alterna entre ter e não ter borda visível. O `rounded-[10px]`
        // estava descrito no comentário e faltava na receita — escrita antes
        // de existir chamador que a exercitasse.
        icon: "size-11 min-h-0 gap-0 rounded-[10px] border border-line bg-surface p-0 text-ink"
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
