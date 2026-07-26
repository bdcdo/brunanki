"use client";

import { CheckCircle2, Clock3, Layers3, Sparkles } from "lucide-react";
import { AppReady } from "@/components/AppReady";
import { CardHeader, CardTitle, cardVariants } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Meter, percentOf } from "@/components/ui/meter";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { summarizeProgress } from "@/domain/mastery";
import { entities } from "@/data/runtime-catalog";
import type { LearningSnapshot } from "@/types/learning";

export default function ProgressPage() {
  return (
    <AppReady loadingLabel="Carregando seu progresso.">
      {({ snapshot }) => <ProgressPageReady snapshot={snapshot} />}
    </AppReady>
  );
}

function ProgressPageReady({ snapshot }: { snapshot: LearningSnapshot }) {
  const { skills, attempts } = snapshot;
  // A regra de domínio vive em domain/mastery.ts. Esta tela a reimplementava
  // à mão e divergia dela: não exigia que a última tentativa fosse correta e
  // contava a mesma entidade em dois estágios ao mesmo tempo.
  const summary = summarizeProgress(
    entities.map(({ id }) => id),
    skills,
    attempts
  );
  const mastered = summary.byStage.mastered;
  const learning = summary.byStage.acquiring;
  const reviewing = summary.byStage.reviewing;
  const firstTry = summary.firstTryCorrect;

  return (
    <div className="mx-auto w-full max-w-page">
      <PageHeader
        eyebrow="Evidência, não sequência"
        title="Progresso"
        description="Domínio exige recordar o nome e reconhecer a bandeira em dias diferentes, com estabilidade de pelo menos 30 dias."
      />

      <div className="mb-[34px] grid grid-cols-4 gap-[15px] max-lg:grid-cols-2 max-md:grid-cols-1">
        <StatCard
          icon={<CheckCircle2 size={23} aria-hidden="true" />}
          label="Dominadas"
          value={mastered}
        />
        <StatCard
          icon={<Clock3 size={23} aria-hidden="true" />}
          label="Em revisão"
          value={reviewing}
        />
        <StatCard
          icon={<Layers3 size={23} aria-hidden="true" />}
          label="Em aprendizagem"
          value={learning}
        />
        <StatCard
          icon={<Sparkles size={23} aria-hidden="true" />}
          label="Acertos de primeira"
          value={firstTry}
        />
      </div>

      <section className={cardVariants()}>
        <CardHeader>
          <CardTitle>Atlas dominado</CardTitle>
          <span className="inline-flex min-h-7 items-center gap-[5px] rounded-full border border-line bg-surface px-2.5 py-1 text-xs leading-body font-bold text-ink-soft">
            {percentOf(mastered, summary.total)}%
          </span>
        </CardHeader>
        <Meter
          value={mastered}
          max={summary.total}
          label="Entidades dominadas"
        />
      </section>

      <section className="mt-[18px] grid grid-cols-[1.35fr_0.65fr] gap-[18px] max-md:grid-cols-1">
        <article className={cardVariants()}>
          <Eyebrow>Como ler</Eyebrow>
          <h2>Uma bandeira passa por três estados</h2>
          <p className="text-ink-soft">
            Nova quando ainda não foi apresentada; em aprendizagem enquanto
            precisa de apoio; em revisão quando já pode ser recuperada sem
            pista. “Dominada” é um marco dentro da revisão, nunca o fim das
            práticas.
          </p>
        </article>
        <article className={cardVariants()}>
          <Eyebrow>Histórico local</Eyebrow>
          <h2>{attempts.length} tentativas</h2>
          <p className="text-ink-soft">
            O histórico fica neste navegador. Faça um backup em Ajustes para
            levá-lo a outro dispositivo.
          </p>
        </article>
      </section>
    </div>
  );
}
