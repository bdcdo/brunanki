import { cva } from "class-variance-authority";
import { Check, CircleAlert, X } from "lucide-react";

import { cn } from "@/lib/utils";
import type { AttemptOutcome } from "@/types/learning";

export type FeedbackTone = "correct" | "partial" | "incorrect";

/**
 * O mapeamento que as duas sessões já faziam, cada uma na sua cópia: acerto,
 * parcial, e todo o resto como incorreto — de modo que "pulado", que só o
 * diagnóstico produz, cai no mesmo tom de um erro.
 */
export function feedbackTone(outcome: AttemptOutcome): FeedbackTone {
  switch (outcome) {
    case "correct":
      return "correct";
    case "partial":
      return "partial";
    case "incorrect":
    case "skipped":
      return "incorrect";
  }
}

const panelVariants = cva("grid gap-[5px] rounded-[14px] border-2 p-[18px]", {
  variants: {
    tone: {
      correct: "border-outcome-correct-line bg-outcome-correct",
      partial: "border-outcome-partial-line bg-outcome-partial",
      incorrect: "border-outcome-incorrect-line bg-outcome-incorrect"
    }
  }
});

const toneIcon = { correct: Check, partial: CircleAlert, incorrect: X };

interface FeedbackPanelProps {
  tone: FeedbackTone;
  eyebrow: string;
  /** O nome correto da entidade. */
  answer: string;
  /** O que a pessoa respondeu, quando difere do correto. */
  submitted?: string;
  submittedLabel?: string;
  explanation: string;
  className?: string;
}

/**
 * O veredito de uma tentativa, nas duas sessões.
 *
 * Substitui dois blocos idênticos, um em cada sessão, que divergiriam na
 * primeira vez que alguém mexesse num só.
 *
 * **A região viva desce para cá, e essa é a mudança que mais importa.** Antes
 * o `aria-live` ficava no cartão inteiro, então cada troca de passo fazia o
 * leitor de tela reler o enunciado, o texto alternativo da bandeira e as
 * quatro alternativas. Com a grade de alternativas permanecendo montada
 * durante o veredito — que é o que permite marcar a opção escolhida —, manter
 * a região no cartão passaria de verboso a inutilizável.
 *
 * A cor não é o único canal: cada tom tem eyebrow textual próprio e ícone
 * próprio, então o veredito continua legível sem percepção de cor.
 */
export function FeedbackPanel({
  tone,
  eyebrow,
  answer,
  submitted,
  submittedLabel = "Sua resposta",
  explanation,
  className
}: FeedbackPanelProps) {
  const Icon = toneIcon[tone];

  return (
    <div role="status" className={cn(panelVariants({ tone }), className)}>
      {/* `text-ink` sobrepõe a cor da classe legada — utilitário vence camada.
          Sem isso o rótulo sai no teal da marca, e um "Vamos corrigir" em cor
          de marca dentro de um painel de erro contradiz o próprio veredito. A
          cor aqui não carrega significado nenhum: quem o carrega são o ícone,
          o texto e a moldura. */}
      <span className="eyebrow flex items-center gap-1.5 text-ink">
        <Icon size={15} strokeWidth={3.2} aria-hidden="true" />
        {eyebrow}
      </span>
      <strong className="text-xl">{answer}</strong>
      {submitted && (
        <span>
          {submittedLabel}: {submitted}
        </span>
      )}
      <span>{explanation}</span>
    </div>
  );
}
