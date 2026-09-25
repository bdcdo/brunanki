"use client";

import { ArrowRight, Lock } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import { AppReady } from "@/components/AppReady";
import { buttonVariants } from "@/components/ui/button";
import { entities } from "@/data/runtime-catalog";
import { buildDailyQueue, newEntityOrder } from "@/domain/daily-queue";
import { entityStage, type EntityStage } from "@/domain/mastery";
import { cn } from "@/lib/utils";
import { CONTINENT_IDS, CONTINENT_LABEL_PT_BR } from "@/types/geography";
import type { LearningSnapshot } from "@/types/learning";

export default function HomePage() {
  return (
    <AppReady loadingLabel="Carregando seu progresso.">
      {({ snapshot }) => <HomePageReady snapshot={snapshot} />}
    </AppReady>
  );
}

/**
 * O que a fila pede agora, dito em uma frase.
 *
 * Os números vêm da mesma `buildDailyQueue` que a sessão usa, com a mesma
 * ordem de novidades do continente ativo. Se a home fizesse a conta por
 * conta própria, ela poderia prometer uma sessão diferente da que abre.
 */
function nextActivity(snapshot: LearningSnapshot): {
  headline: string;
  hasWork: boolean;
} {
  const plan = buildDailyQueue({
    entityOrder: newEntityOrder(entities, snapshot.settings.activeContinent),
    states: snapshot.skills,
    recentAttempts: snapshot.attempts,
    baseNewLimit: 5
  });
  const reviews = plan.dueCount + plan.correctionCount;
  const hasNew = plan.items.some(({ reason }) => reason === "new");
  const reviewText =
    reviews === 1 ? "1 revisão pendente" : `${reviews} revisões pendentes`;

  if (reviews > 0 && hasNew) {
    return { headline: `${reviewText}, depois bandeira nova`, hasWork: true };
  }
  if (reviews > 0) return { headline: reviewText, hasWork: true };
  if (hasNew) {
    return {
      headline:
        snapshot.skills.length === 0
          ? "Sua primeira bandeira está pronta"
          : "Próxima bandeira nova",
      hasWork: true
    };
  }
  return { headline: "Nada pendente agora", hasWork: false };
}

// Os três estados se separam pela forma, e não pela cor: cheia, meio cheia e
// só o contorno tracejado do espaço do álbum. Um verde claro para "em
// andamento" mediria pouco mais de 1:1 contra o branco e não diria nada.
const HALF_FILLED =
  "border-[1.5px] border-dashed border-input bg-[linear-gradient(to_top,var(--brand)_50%,transparent_50%)]";
const SLOT_CLASS: Record<EntityStage, string> = {
  mastered: "bg-brand",
  reviewing: HALF_FILLED,
  acquiring: HALF_FILLED,
  unseen: "border-[1.5px] border-dashed border-input"
};

function HomePageReady({ snapshot }: { snapshot: LearningSnapshot }) {
  const continent = snapshot.settings.activeContinent;
  const activity = nextActivity(snapshot);

  const stages = useMemo(
    () =>
      entities
        .filter((entity) => entity.continent === continent)
        .map(({ id }) => entityStage(id, snapshot.skills)),
    [continent, snapshot.skills]
  );
  const mastered = stages.filter((stage) => stage === "mastered").length;
  const unseen = stages.filter((stage) => stage === "unseen").length;
  const inProgress = stages.length - mastered - unseen;
  const others = CONTINENT_IDS.filter((id) => id !== continent);

  return (
    <div className="mx-auto grid w-full max-w-page grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] gap-8 max-lg:grid-cols-1 max-md:gap-5">
      <section
        aria-labelledby="album-title"
        className="overflow-hidden rounded-card bg-surface shadow-card max-lg:order-2"
      >
        <div className="flex items-baseline justify-between gap-4 bg-brand px-7 py-5 text-brand-on max-md:px-5 max-md:py-4">
          <h1
            id="album-title"
            className="font-title text-5xl leading-page font-extrabold tracking-title max-md:text-4xl"
          >
            Álbum das {CONTINENT_LABEL_PT_BR[continent]}
          </h1>
          <span className="text-base">{stages.length} figurinhas</span>
        </div>
        <div className="px-7 pt-6 pb-7 max-md:px-5 max-md:pt-5 max-md:pb-6">
          <p className="m-0 flex items-baseline gap-2">
            <strong className="font-title text-figure leading-figure font-extrabold">
              {mastered}
            </strong>
            <span className="text-lg text-ink-soft">
              de {stages.length} coladas
            </span>
          </p>
          {/* Uma casa por bandeira, na ordem do catálogo. É imagem para o
              leitor de tela, com a contagem no rótulo, porque ler as casas uma
              a uma não informa nada que a frase abaixo não diga. */}
          <div
            role="img"
            aria-label={`${mastered} coladas, ${inProgress} em andamento, ${unseen} vazias`}
            className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(18px,1fr))] gap-1.5"
          >
            {stages.map((stage, index) => (
              <span
                key={index}
                className={cn("h-5 rounded-[4px]", SLOT_CLASS[stage])}
              />
            ))}
          </div>
          <p className="mt-4 mb-0 text-base text-ink-soft">
            {inProgress} em andamento, {unseen} vazias. A figurinha é colada
            quando a bandeira fica dominada.
          </p>
        </div>
      </section>

      <div className="flex flex-col gap-5 max-lg:order-1">
        <section
          aria-labelledby="activity-title"
          className="on-ink rounded-card bg-ink p-7 text-on-ink max-md:p-5"
        >
          <p className="m-0 text-base text-on-ink-soft">Agora</p>
          <h2
            id="activity-title"
            className="mt-1 mb-6 font-title text-4xl leading-name font-extrabold tracking-title"
          >
            {activity.headline}
          </h2>
          {activity.hasWork ? (
            <Link
              href="/estudar"
              className={cn(buttonVariants({ variant: "highlight" }), "w-full")}
            >
              Estudar agora <ArrowRight size={19} aria-hidden="true" />
            </Link>
          ) : (
            <p className="m-0 text-on-ink-soft">
              A próxima revisão chega quando a memória estiver para esquecer.
              Enquanto isso, o álbum mostra o que já está colado.
            </p>
          )}
        </section>

        <section aria-labelledby="others-title">
          <h2 id="others-title" className="mb-2.5 text-base font-bold">
            Outros álbuns
          </h2>
          <ul className="m-0 grid list-none grid-cols-2 gap-2.5 p-0">
            {others.map((id) => (
              <li
                key={id}
                className="flex items-center gap-2 rounded-control border-[1.5px] border-dashed border-input bg-surface px-3.5 py-3 text-ink-soft"
              >
                <Lock size={16} aria-hidden="true" />
                {CONTINENT_LABEL_PT_BR[id]}, fechado
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
