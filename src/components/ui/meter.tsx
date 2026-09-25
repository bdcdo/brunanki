import { cn } from "@/lib/utils";

/**
 * A conta que estava duplicada entre `ProgressBar` e a tela de progresso, com
 * uma diferença silenciosa: lá o valor não era limitado, então um numerador
 * maior que o denominador produzia mais de 100%.
 */
export function percentOf(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((value / max) * 100)));
}

interface MeterProps {
  value: number;
  max: number;
  label: string;
  className?: string;
}

/**
 * Progresso para conjuntos grandes, como o álbum inteiro.
 *
 * Continua sendo `role="progressbar"` e não o `<meter>` nativo — aquele
 * elemento tem semântica de medição (nível de tanque), não de avanço, e a
 * estilização dele diverge entre navegadores.
 *
 * Duas coisas que a barra anterior não fazia. O valor é limitado ao intervalo
 * antes de virar `aria-valuenow`: a fila de estudo cresce no meio da sessão
 * quando um erro reinsere o item, e o valor cru podia ultrapassar o máximo
 * anunciado. E `aria-valuetext` existe para o leitor dizer "12 de 40" em vez
 * de "5%" — a porcentagem é o que se vê, a contagem é o que se quer saber.
 */
export function Meter({ value, max, label, className }: MeterProps) {
  const clamped = Math.min(Math.max(value, 0), Math.max(max, 0));

  return (
    <div className={cn("grid gap-2", className)}>
      <div className="flex items-center justify-between gap-4 text-sm text-ink-soft">
        <span>{label}</span>
        <strong className="text-ink">
          {clamped} de {max}
        </strong>
      </div>
      <div
        className="h-3 overflow-hidden rounded-full border border-input bg-white"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={clamped}
        aria-valuetext={`${clamped} de ${max}`}
      >
        {/* O único style inline que sobrevive à migração: uma porcentagem
            calculada em runtime não tem como virar classe, que é compilada. */}
        <span
          className="block h-full rounded-[inherit] bg-brand"
          style={{ width: `${percentOf(clamped, max)}%` }}
        />
      </div>
    </div>
  );
}
