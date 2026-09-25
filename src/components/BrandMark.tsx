import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * A marca: três faixas horizontais numa moldura arredondada.
 *
 * Vive fora do AppShell porque a casca de sessão também precisa dela — lá ela
 * é, além da identidade, a única saída da tela.
 *
 * As três faixas eram `:nth-child(1|2|3)` no CSS legado. Como classe em cada
 * `<span>`, a cor de cada faixa fica dita onde ela está, em vez de depender da
 * ordem: acrescentar uma quarta faixa deixa de recolorir a terceira em
 * silêncio.
 */
export function BrandMark() {
  return (
    <span
      className="grid h-[30px] w-9 overflow-hidden rounded-[7px] border-2 border-current"
      aria-hidden="true"
    >
      <span className="bg-highlight" />
      <span className="bg-surface" />
      <span className="bg-alert" />
    </span>
  );
}

export function BrandLink({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        // `leading-body` porque `text-3xl` traz o 1,25 de `--lead-name` junto
        // com os 28px, e a regra legada herdava o 1,5 do corpo. Aqui a
        // entrelinha do `<strong>` é o que decide a altura do inline-flex, e
        // com ela a altura inteira do cabeçalho móvel.
        "inline-flex items-center gap-3 font-title text-3xl leading-body tracking-title text-inherit no-underline",
        className
      )}
      aria-label="Brunanki, página inicial"
    >
      <BrandMark />
      <strong>brunanki</strong>
    </Link>
  );
}
