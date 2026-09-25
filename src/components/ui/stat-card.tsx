import type { ReactNode } from "react";

import { cardVariants } from "@/components/ui/card";

/**
 * Um número com nome — a unidade das grades da home e da tela de progresso.
 *
 * As dezesseis ocorrências repetiam a mesma tríade rótulo/valor/nota, e as três
 * regras de descendente que a compunham (`.stat-card span`, `.stat-card
 * strong`) estavam presas à estrutura: qualquer `<span>` que caísse dentro do
 * cartão herdava os 14px, e qualquer `<strong>` herdava a escala de display.
 * Como props, cada papel fica dito em vez de deduzido do elemento.
 *
 * `leading-body` no valor não é detalhe: `text-4xl` traz o 1,04 de
 * `--lead-page` junto com os 34px, e a regra legada não declarava entrelinha —
 * herdava o 1,5 do corpo. Num `<strong>` promovido a bloco, a diferença entre
 * 1,5 e 1,04 são quinze pixels de altura, dezesseis vezes.
 */
export function StatCard({
  icon,
  label,
  value,
  note
}: {
  icon?: ReactNode;
  label: string;
  value: ReactNode;
  note?: string;
}) {
  return (
    <article className={cardVariants({ padding: "sm" })}>
      {icon}
      <span className="text-sm text-ink-soft">{label}</span>
      <strong className="mt-1 block font-title text-4xl leading-body tracking-title">
        {value}
      </strong>
      {note && <small className="text-ink-soft">{note}</small>}
    </article>
  );
}
