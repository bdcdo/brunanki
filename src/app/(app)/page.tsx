"use client";

import { ArrowRight, Lock } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import { AppReady } from "@/components/AppReady";
import { buttonVariants } from "@/components/ui/button";
import { introductionOrder } from "@/data/curriculum";
import { entities } from "@/data/runtime-catalog";
import { dueCount, nextActivity } from "@/domain/next-activity";
import { entityStage, type EntityStage } from "@/domain/mastery";
import { xpTotals } from "@/domain/xp";
import { cn } from "@/lib/utils";
import {
  CONTINENT_IDS,
  CONTINENT_LABEL_PT_BR,
  CONTINENT_OF_PT_BR
} from "@/types/geography";
import type { LearningSnapshot } from "@/types/learning";

export default function HomePage() {
  return (
    <AppReady loadingLabel="Carregando seu progresso.">
      {({ snapshot }) => <HomePageReady snapshot={snapshot} />}
    </AppReady>
  );
}

/**
 * O que a sessão vai pedir agora, dito em uma frase.
 *
 * Sai da mesma `nextActivity` que a sessão chama, com a mesma ordem de
 * novidades do continente ativo. Se a home fizesse a conta por conta
 * própria, ela poderia prometer uma sessão diferente da que abre.
 */
function nextActivityHeadline(snapshot: LearningSnapshot): {
  headline: string;
  hasWork: boolean;
} {
  const next = nextActivity({
    states: snapshot.skills,
    entityOrder: introductionOrder(snapshot.settings.activeContinent)
  });
  if (!next) return { headline: "Nada pendente agora", hasWork: false };
  const due = dueCount(snapshot.skills);
  if (due > 0) {
    return {
      headline: due === 1 ? "1 revisão vencida" : `${due} revisões vencidas`,
      hasWork: true
    };
  }
  if (next.reason === "correction") {
    return { headline: "Corrigir um erro recente", hasWork: true };
  }
  return {
    headline:
      snapshot.skills.length === 0
        ? "Sua primeira bandeira está pronta"
        : "Próxima bandeira nova",
    hasWork: true
  };
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
  const activity = nextActivityHeadline(snapshot);
  const xp = xpTotals(snapshot.attempts, snapshot.settings.timeZone);

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
  const stageSummary = `${mastered} ${mastered === 1 ? "colada" : "coladas"}, ${inProgress} em andamento, ${unseen} ${unseen === 1 ? "vazia" : "vazias"}`;
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
            Álbum {CONTINENT_OF_PT_BR[continent]}
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
            aria-label={stageSummary}
            className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(18px,1fr))] gap-1.5"
          >
            {stages.map((stage, index) => (
              <span
                key={index}
                className={cn("h-5 rounded-[4px]", SLOT_CLASS[stage])}
              />
            ))}
          </div>
          {/* A legenda diz qual forma é qual estado, e as contagens vão em
              texto: a faixa sozinha seria só forma. */}
          <ul className="mt-4 mb-0 flex list-none flex-wrap gap-x-5 gap-y-1.5 p-0 text-base text-ink-soft">
            <li className="flex items-center gap-2">
              <span
                className={cn("h-4 w-5 rounded-[4px]", SLOT_CLASS.mastered)}
              />
              {mastered} {mastered === 1 ? "colada" : "coladas"}
            </li>
            <li className="flex items-center gap-2">
              <span
                className={cn("h-4 w-5 rounded-[4px]", SLOT_CLASS.acquiring)}
              />
              {inProgress} em andamento
            </li>
            <li className="flex items-center gap-2">
              <span
                className={cn("h-4 w-5 rounded-[4px]", SLOT_CLASS.unseen)}
              />
              {unseen} {unseen === 1 ? "vazia" : "vazias"}
            </li>
          </ul>
          <p className="mt-3 mb-0 text-sm text-ink-soft">
            A figurinha é colada quando a bandeira fica dominada.
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

        {/* O que pontua é regra do domínio, em awardedXpFor; a tela só mostra
            a soma. O número vem antes do rótulo na tela, mas não na leitura:
            o leitor de tela ouve o que o número mede antes de ouvi-lo. */}
        <section aria-labelledby="xp-title">
          <h2 id="xp-title" className="sr-only">
            Experiência
          </h2>
          <dl className="m-0 grid grid-cols-2 gap-2.5">
            {(
              [
                ["XP hoje", xp.today],
                ["XP no total", xp.total]
              ] as const
            ).map(([label, value]) => (
              <div
                key={label}
                className="flex flex-col-reverse rounded-control bg-surface px-4 py-3 shadow-card"
              >
                <dt className="text-base text-ink-soft">{label}</dt>
                <dd className="m-0 font-title text-4xl leading-figure font-extrabold">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
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
