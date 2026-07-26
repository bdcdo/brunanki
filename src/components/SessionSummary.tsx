import type { ReactNode } from "react";

import { sessionCard } from "@/components/ui/card";
import { SessionPips, type PipState } from "@/components/ui/pips";

interface Tally {
  label: string;
  value: number;
}

interface SessionSummaryProps {
  eyebrow: string;
  /** O número que é a tela. */
  figure: number;
  figureLabel: string;
  pips?: readonly PipState[];
  tallies?: readonly Tally[];
  action: ReactNode;
}

/**
 * O fecho de uma sessão, com um número.
 *
 * As duas telas de resumo que existiam eram cartões estáticos sem nenhum: a de
 * estudo dizia "Bom trabalho de recuperação" e a de diagnóstico dizia que o
 * ponto de partida estava pronto, e nem uma nem outra dizia *o quê*. Os dados
 * já estavam nos componentes; faltava mostrá-los.
 *
 * O acabamento herdado é a escala de display aplicada a um número — mas a um
 * recapitulativo, não a um pôster. Fica de fora a gramática de jogo: nada de
 * `fixed inset-0` inundando a tela de cor, nada de caixa alta de vitória, nada
 * de copy de placar. Numa sessão de repetição espaçada não há vencedor, há
 * itens agendados, e inundar a tela de coral por seis erros em vinte
 * enquadraria como derrota justamente o comportamento que o FSRS quer.
 *
 * Registrado para quem vier depois: --brand-deep nunca como fundo. Ele existe
 * como cor de texto, que é o papel dele.
 */
export function SessionSummary({
  eyebrow,
  figure,
  figureLabel,
  pips,
  tallies,
  action
}: SessionSummaryProps) {
  return (
    <div className="page page-narrow">
      <section className={sessionCard}>
        <span className="eyebrow">{eyebrow}</span>
        {/* min-w-0 obrigatório: o tracking negativo da escala de display num
            filho de flex estoura a largura numa Pixel 7 sem ele. */}
        <div className="mt-2 flex min-w-0 flex-wrap items-baseline gap-x-4 gap-y-1">
          <strong className="font-title text-figure tracking-page">
            {figure}
          </strong>
          <span className="text-lg text-ink-soft">{figureLabel}</span>
        </div>

        {pips && pips.length > 0 && (
          <div className="mt-6">
            <SessionPips
              states={pips}
              position={pips.length}
              label="Desfecho de cada item"
            />
          </div>
        )}

        {tallies && tallies.length > 0 && (
          <dl className="mt-7 flex flex-wrap gap-x-9 gap-y-3">
            {tallies.map(({ label, value }) => (
              <div key={label} className="min-w-0">
                <dt className="eyebrow">{label}</dt>
                <dd className="text-2xl font-bold">{value}</dd>
              </div>
            ))}
          </dl>
        )}

        <div className="mt-8">{action}</div>
      </section>
    </div>
  );
}
