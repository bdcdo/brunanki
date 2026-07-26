"use client";

import { CheckCircle2, Clock3, Layers3, Sparkles } from "lucide-react";
import { AppReady } from "@/components/AppReady";
import { Meter, percentOf } from "@/components/ui/meter";
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
    <div className="page">
      <header className="page-header">
        <div>
          <span className="eyebrow">Evidência, não sequência</span>
          <h1>Progresso</h1>
          <p>
            Domínio exige recordar o nome e reconhecer a bandeira em dias
            diferentes, com estabilidade de pelo menos 30 dias.
          </p>
        </div>
      </header>

      <div className="stats-grid">
        <article className="stat-card">
          <CheckCircle2 size={23} aria-hidden="true" />
          <span>Dominadas</span>
          <strong>{mastered}</strong>
        </article>
        <article className="stat-card">
          <Clock3 size={23} aria-hidden="true" />
          <span>Em revisão</span>
          <strong>{reviewing}</strong>
        </article>
        <article className="stat-card">
          <Layers3 size={23} aria-hidden="true" />
          <span>Em aprendizagem</span>
          <strong>{learning}</strong>
        </article>
        <article className="stat-card">
          <Sparkles size={23} aria-hidden="true" />
          <span>Acertos de primeira</span>
          <strong>{firstTry}</strong>
        </article>
      </div>

      <section className="card">
        <div className="section-heading">
          <h2>Atlas dominado</h2>
          <span className="pill">{percentOf(mastered, summary.total)}%</span>
        </div>
        <Meter
          value={mastered}
          max={summary.total}
          label="Entidades dominadas"
        />
      </section>

      <section className="mt-[18px] grid grid-cols-[1.35fr_0.65fr] gap-[18px] max-md:grid-cols-1">
        <article className="card">
          <span className="eyebrow">Como ler</span>
          <h2>Uma bandeira passa por três estados</h2>
          <p className="muted">
            Nova quando ainda não foi apresentada; em aprendizagem enquanto
            precisa de apoio; em revisão quando já pode ser recuperada sem
            pista. “Dominada” é um marco dentro da revisão, nunca o fim das
            práticas.
          </p>
        </article>
        <article className="card">
          <span className="eyebrow">Histórico local</span>
          <h2>{attempts.length} tentativas</h2>
          <p className="muted">
            O histórico fica neste navegador. Faça um backup em Ajustes para
            levá-lo a outro dispositivo.
          </p>
        </article>
      </section>
    </div>
  );
}
