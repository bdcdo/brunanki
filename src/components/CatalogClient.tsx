"use client";

import { Check, Clock3, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AppReady } from "@/components/AppReady";
import { FlagImage } from "@/components/FlagImage";
import {
  StageLegend,
  countStages,
  type StageCounts
} from "@/components/ui/stage-legend";
import { albumPages } from "@/data/curriculum";
import { entities, entityById } from "@/data/runtime-catalog";
import { entityStage, type EntityStage } from "@/domain/mastery";
import { normalizeCountryName } from "@/domain/text";
import { cn } from "@/lib/utils";
import { CONTINENT_OF_PT_BR, SUBREGION } from "@/types/geography";
import type { LearningSnapshot } from "@/types/learning";
import type { RuntimeEntity } from "@/types/runtime-catalog";

/**
 * A busca fica fora do portão do armazenamento: ela leva à página de licença
 * e atribuição de cada bandeira, que não depende de progresso nenhum, e com o
 * IndexedDB indisponível o álbum some, mas a busca continua funcionando.
 */
export function CatalogClient() {
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const normalized = normalizeCountryName(query);
    if (!normalized) return undefined;
    return entities.filter((entity) =>
      normalizeCountryName(
        [entity.displayNamePtBr, ...entity.aliasesPtBr].join(" ")
      ).includes(normalized)
    );
  }, [query]);

  return (
    <div className="mx-auto w-full max-w-page">
      <label className="relative mb-6 grid gap-[7px]">
        <span className="sr-only">Buscar qualquer bandeira</span>
        {/* O ícone é irmão do campo, não filho: posicioná-lo por cima e
            abrir espaço com o `pl-[46px]` do input mantém o alvo de clique
            do campo inteiro, que envolvê-lo numa caixa quebraria. */}
        <Search
          size={20}
          aria-hidden="true"
          className="absolute top-[14px] left-[15px] text-ink-soft"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`Buscar entre as ${entities.length} bandeiras`}
          className="min-h-[50px] w-full rounded-control border border-input bg-surface py-[11px] pr-[14px] pl-[46px] text-ink"
        />
      </label>
      {/* Montada desde o início: uma região viva que surge já com texto
          costuma não ser anunciada. */}
      <p className="mt-0 text-ink-soft" aria-live="polite">
        {results
          ? `${results.length} ${results.length === 1 ? "resultado" : "resultados"}`
          : ""}
      </p>
      {results ? (
        <>
          <h1 className="sr-only">Busca no catálogo</h1>
          <SearchResults results={results} />
        </>
      ) : (
        <AppReady loadingLabel="Abrindo o álbum.">
          {({ snapshot }) => <AlbumReady snapshot={snapshot} />}
        </AppReady>
      )}
    </div>
  );
}

const STAGE_LABEL: Record<EntityStage, string> = {
  mastered: "colada",
  reviewing: "em andamento",
  acquiring: "em andamento",
  unseen: "vazia"
};

function AlbumReady({ snapshot }: { snapshot: LearningSnapshot }) {
  const continent = snapshot.settings.activeContinent;
  const pages = useMemo(() => albumPages(continent), [continent]);
  const stageOf = useMemo(() => {
    const stages = new Map<string, EntityStage>();
    for (const { slots } of pages) {
      for (const { entityId } of slots) {
        stages.set(entityId, entityStage(entityId, snapshot.skills));
      }
    }
    return stages;
  }, [pages, snapshot.skills]);
  const counts = countStages([...stageOf.values()]);

  return (
    <>
      <header className="mb-6 overflow-hidden rounded-card bg-surface shadow-card">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 bg-brand px-7 py-5 text-brand-on max-md:px-5 max-md:py-4">
          <h1 className="m-0 font-title text-5xl leading-page font-extrabold tracking-title max-md:text-4xl">
            Álbum {CONTINENT_OF_PT_BR[continent]}
          </h1>
          <span className="text-base">
            {counts.mastered} de {stageOf.size} coladas
          </span>
        </div>
        <div className="grid gap-4 px-7 py-5 max-md:px-5">
          <StageLegend counts={counts} />
          <p className="m-0 text-sm text-ink-soft">
            O número é a ordem sugerida em que as bandeiras novas chegam. A
            figurinha é colada quando a bandeira fica dominada.
          </p>
        </div>
      </header>

      <div className="grid gap-6">
        {pages.map(({ subregion, slots }) => {
          const pageCounts = countStages(
            slots.map(({ entityId }) => stageOf.get(entityId) ?? "unseen")
          );
          return (
            <section
              key={subregion}
              aria-labelledby={`page-${subregion}`}
              className="rounded-card bg-surface p-6 shadow-card max-md:p-4"
            >
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4">
                <h2
                  id={`page-${subregion}`}
                  className="m-0 font-title text-3xl font-extrabold tracking-title"
                >
                  {SUBREGION[subregion].labelPtBr}
                </h2>
                <PageCount counts={pageCounts} total={slots.length} />
              </div>
              <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4 p-0 max-md:grid-cols-2 max-md:gap-3">
                {slots.map(({ entityId, number }) => {
                  const entity = entityById.get(entityId);
                  if (!entity) return null;
                  return (
                    <li key={entityId}>
                      <AlbumSlot
                        entity={entity}
                        number={number}
                        stage={stageOf.get(entityId) ?? "unseen"}
                      />
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}

function PageCount({ counts, total }: { counts: StageCounts; total: number }) {
  return (
    <span className="text-base text-ink-soft">
      {counts.mastered} de {total} coladas
    </span>
  );
}

/**
 * Uma casa do álbum. Os três estados se distinguem pela forma, e não só pela
 * cor: a colada é a bandeira inteira sobre papel, com sombra de figurinha; a
 * em andamento é a bandeira dentro da moldura tracejada; a vazia não tem
 * bandeira, só o número e o nome, como no álbum de papel. O rótulo de texto
 * vai junto, para quem não distingue a sombra.
 */
function AlbumSlot({
  entity,
  number,
  stage
}: {
  entity: RuntimeEntity;
  number: number;
  stage: EntityStage;
}) {
  const label = STAGE_LABEL[stage];
  return (
    <Link
      href={`/catalogo/${entity.id}`}
      aria-label={`${number}, ${entity.displayNamePtBr}, ${label}`}
      className="group grid gap-2 rounded-control p-1 text-inherit no-underline"
    >
      {stage === "mastered" ? (
        <span
          className={cn(
            "relative block rounded-[6px] bg-surface p-1.5 shadow-sticker ring-1 ring-line transition-transform group-hover:-translate-y-[2px]",
            number % 2 === 0 ? "rotate-1" : "-rotate-1"
          )}
        >
          <FlagImage entity={entity} alt={{ kind: "decorative" }} size="fill" />
        </span>
      ) : stage === "unseen" ? (
        <span className="grid aspect-[3/2] place-items-center rounded-[6px] border-[1.5px] border-dashed border-input">
          <span className="font-title text-4xl font-extrabold text-ink-soft">
            {number}
          </span>
        </span>
      ) : (
        <span className="block rounded-[6px] border-[1.5px] border-dashed border-input p-1.5">
          <FlagImage entity={entity} alt={{ kind: "decorative" }} size="fill" />
        </span>
      )}
      <span className="grid gap-0.5" aria-hidden="true">
        <strong className="leading-name">
          {stage === "unseen" ? "" : `${number}. `}
          {entity.displayNamePtBr}
        </strong>
        {stage !== "unseen" && (
          <span className="inline-flex items-center gap-1 text-sm text-ink-soft">
            {stage === "mastered" ? (
              <Check size={15} aria-hidden="true" />
            ) : (
              <Clock3 size={15} aria-hidden="true" />
            )}
            {label}
          </span>
        )}
      </span>
    </Link>
  );
}

function SearchResults({ results }: { results: readonly RuntimeEntity[] }) {
  return (
    <>
      {results.length === 0 ? (
        <div className="rounded-card border border-dashed border-input p-11 text-center text-ink-soft">
          Nenhuma bandeira corresponde à busca.
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4 max-lg:grid-cols-2 max-md:grid-cols-1">
          {results.map((entity) => (
            <Link
              href={`/catalogo/${entity.id}`}
              className="grid overflow-hidden rounded-card border border-line bg-surface text-inherit no-underline shadow-card transition-[transform,box-shadow] hover:-translate-y-[2px] hover:shadow-card-lifted"
              key={entity.id}
            >
              <FlagImage entity={entity} alt={{ kind: "named" }} size="card" />
              <span className="p-[15px]">
                <strong className="block leading-name">
                  {entity.displayNamePtBr}
                </strong>
                <span className="text-xs leading-body text-ink-soft">
                  {SUBREGION[entity.subregion].labelPtBr}
                </span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
