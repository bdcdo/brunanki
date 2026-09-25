import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";
import type { AttemptOutcome } from "@/types/learning";

/**
 * Progresso da sessão como unidades contáveis, uma por item.
 *
 * Numa sessão de repetição espaçada o desfecho por item é o conteúdo: o que
 * importa saber é quais seis ainda se deve, não que 70% passou. Uma barra
 * responde à segunda pergunta e esconde a primeira.
 *
 * `amended` é o estado que um quiz não precisa ter. Lá, errar encerra a
 * partida e bastam "feita" e "perdida"; aqui o item volta quatro posições à
 * frente e pode ser recuperado, então a bolinha perdida passa a corrigida.
 *
 * O tipo descreve desfecho, e só. "Em curso" não entra aqui porque é posição,
 * não resultado — quem desenha essa marca é a prop `position`.
 */
export type PipState = "pending" | "correct" | "partial" | "missed" | "amended";

export function pipStateFor(outcome: AttemptOutcome): PipState {
  switch (outcome) {
    case "correct":
      return "correct";
    case "partial":
      return "partial";
    case "incorrect":
      return "missed";
    // Improduzível em /estudar — só o diagnóstico oferece "Pular" —, mas o
    // tipo o inclui e o compilador exige tratá-lo. Um item pulado é um item
    // que não se sabe, que é o mesmo desfecho prático de um errado.
    case "skipped":
      return "missed";
  }
}

/**
 * Desfecho de uma repetição imediata, que reescreve a bolinha do item que
 * corrige em vez de criar outra: uma correção não é um item novo.
 */
export function amendedPipState(outcome: AttemptOutcome): PipState {
  return outcome === "correct" || outcome === "partial" ? "amended" : "missed";
}

/**
 * A cor sozinha não distingue os estados para quem não a percebe, e a bolinha
 * é pequena demais para caber um ícone. A redundância é de forma: vazada com
 * traço fino é pendente, vazada com traço grosso é perdida, preenchida é
 * resolvida, e preenchida com aro é corrigida — quatro silhuetas legíveis a
 * 10px, inclusive em escala de cinza.
 */
const pipVariants = cva("size-2.5 shrink-0 rounded-full border-2", {
  variants: {
    state: {
      pending: "border-input/70 bg-transparent",
      correct: "border-outcome-correct-line bg-outcome-correct-line",
      partial: "border-outcome-partial-line bg-outcome-partial-line",
      missed: "border-outcome-incorrect-line bg-transparent",
      // Preenchida como um acerto, com o aro na cor do erro que ela desfaz.
      amended:
        "border-outcome-correct-line bg-outcome-correct-line ring-2 ring-outcome-incorrect-line/45"
    }
  },
  defaultVariants: { state: "pending" }
});

interface SessionPipsProps {
  states: readonly PipState[];
  /** Índice do item em curso. Marca a bolinha sem alterar o estado dela. */
  position: number;
  label: string;
}

export function SessionPips({ states, position, label }: SessionPipsProps) {
  const current = Math.min(Math.max(position, 0), states.length);

  return (
    <div
      // Um `role` só, no contêiner. Vinte bolinhas anunciando cada uma o
      // próprio estado transformariam a barra da sessão numa parede de texto,
      // e o desfecho de cada item já é anunciado no momento em que acontece.
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={states.length}
      aria-valuenow={current}
      aria-valuetext={`${current} de ${states.length}`}
      // Quebrar linha em vez de encolher: espremer preservaria a linha única
      // ao custo do alvo de 10px, que é o que torna as bolinhas contáveis.
      className="flex flex-wrap items-center gap-1.5"
    >
      {states.map((state, index) => (
        <span
          key={index}
          aria-hidden="true"
          className={cn(
            pipVariants({ state }),
            // `outline`, e não `ring`: o anel do Tailwind com deslocamento
            // pinta a cor de fundo no vão, e aqui o fundo é o papel frio da
            // página, não branco. O contorno deixa passar o que estiver atrás.
            index === current &&
              "outline-2 outline-offset-2 outline-brand-ui/55"
          )}
        />
      ))}
    </div>
  );
}
