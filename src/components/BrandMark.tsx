import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * A marca: uma figurinha colada, levemente torta, com a página verde das
 * Américas dentro. É o mesmo objeto que o álbum mostra para uma bandeira
 * dominada, e por isso ela usa a sombra de figurinha, e não uma borda.
 *
 * Vive fora do AppShell porque a casca de sessão também precisa dela.
 */
export function BrandMark() {
  return (
    <span
      className="grid h-[34px] w-7 -rotate-[4deg] place-items-center rounded-[4px] bg-surface shadow-sticker ring-1 ring-line"
      aria-hidden="true"
    >
      <span className="h-[13px] w-5 rounded-[2px] bg-brand" />
    </span>
  );
}

export function BrandLink({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        // `leading-body` porque `text-3xl` traz o 1,25 de `--lead-name` junto
        // com os 28px; aqui a entrelinha do `<strong>` decide a altura do
        // inline-flex, e com ela a do cabeçalho.
        "inline-flex items-center gap-2.5 font-title text-3xl leading-body font-extrabold tracking-title text-inherit no-underline",
        className
      )}
      aria-label="Brunanki, página inicial"
    >
      <BrandMark />
      <strong>brunanki</strong>
    </Link>
  );
}
