"use client";

import { CheckCircle2, Clock3, Layers3, Sparkles } from "lucide-react";
import { AppReady } from "@/components/AppReady";
import { CardHeader, CardTitle, cardVariants } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Meter, percentOf } from "@/components/ui/meter";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { StageLegend, countStages } from "@/components/ui/stage-legend";
import { entityStage, summarizeProgress } from "@/domain/mastery";
import { xpTotals } from "@/domain/xp";
import { CONTINENT_OF_PT_BR } from "@/types/geography";
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
  const { skills, attempts, settings } = snapshot;
  const continent = settings.activeContinent;
  // A regra de domínio vive em domain/mastery.ts. Esta tela a reimplementava
  // à mão e divergia dela: não exigia que a última tentativa fosse correta e
  // contava a mesma entidade em dois estágios ao mesmo tempo. Pelo mesmo
  // motivo o texto não descreve o critério: diz o estado, e não por que.
  const albumIds = entities
    .filter((entity) => entity.continent === continent)
    .map(({ id }) => id);
  const album = countStages(albumIds.map((id) => entityStage(id, skills)));
  const everything = summarizeProgress(
    entities.map(({ id }) => id),
    skills,
    attempts
  );
  const xp = xpTotals(attempts, settings.timeZone);

  return (
    <div className="mx-auto w-full max-w-page">
      <PageHeader
        eyebrow={`Álbum ${CONTINENT_OF_PT_BR[continent]}`}
        title="Progresso"
        description="O que já está colado, o que está em andamento e o que ainda falta, a partir das respostas guardadas neste navegador."
      />

      <div className="mb-[34px] grid grid-cols-4 gap-[15px] max-lg:grid-cols-2">
        <StatCard
          icon={<CheckCircle2 size={23} aria-hidden="true" />}
          label="Coladas"
          value={album.mastered}
        />
        <StatCard
          icon={<Clock3 size={23} aria-hidden="true" />}
          label="Em andamento"
          value={album.inProgress}
        />
        <StatCard
          icon={<Sparkles size={23} aria-hidden="true" />}
          label="XP no total"
          value={xp.total}
          note="Em todos os álbuns"
        />
        <StatCard
          icon={<Layers3 size={23} aria-hidden="true" />}
          label="Acertos de primeira"
          value={everything.firstTryCorrect}
          note="Em todos os álbuns"
        />
      </div>

      <section className={cardVariants()}>
        <CardHeader>
          <CardTitle>Álbum {CONTINENT_OF_PT_BR[continent]}</CardTitle>
          <span className="inline-flex min-h-7 items-center gap-[5px] rounded-full border border-line bg-surface px-2.5 py-1 text-xs leading-body font-bold text-ink-soft">
            {percentOf(album.mastered, albumIds.length)}%
          </span>
        </CardHeader>
        <Meter
          value={album.mastered}
          max={albumIds.length}
          label="Figurinhas coladas"
        />
        <StageLegend counts={album} className="mt-4" />
        <p className="mt-3 mb-0 text-sm text-ink-soft">
          Em todas as {everything.total} bandeiras,{" "}
          {everything.byStage.mastered}{" "}
          {everything.byStage.mastered === 1 ? "colada" : "coladas"}.
        </p>
      </section>

      <section className="mt-[18px] grid grid-cols-[1.35fr_0.65fr] gap-[18px] max-md:grid-cols-1">
        <article className={cardVariants()}>
          <Eyebrow>Como ler</Eyebrow>
          <h2>Cada figurinha tem três estados</h2>
          <p className="text-ink-soft">
            Vazia enquanto a bandeira não apareceu; em andamento enquanto ela
            volta nas revisões; colada quando fica dominada. Colar não encerra
            as revisões, e uma figurinha colada pode voltar para em andamento.
          </p>
        </article>
        <article className={cardVariants()}>
          <Eyebrow>Histórico local</Eyebrow>
          <h2>
            {attempts.length}{" "}
            {attempts.length === 1 ? "tentativa" : "tentativas"}
          </h2>
          <p className="text-ink-soft">
            O histórico fica neste navegador. Faça um backup em Ajustes para
            levá-lo a outro aparelho.
          </p>
        </article>
      </section>
    </div>
  );
}
