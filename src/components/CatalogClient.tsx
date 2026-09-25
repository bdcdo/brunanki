"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { FlagImage } from "@/components/FlagImage";
import { PageHeader } from "@/components/ui/page-header";
import { entities } from "@/data/runtime-catalog";
import { normalizeCountryName } from "@/domain/text";

export function CatalogClient() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const normalized = normalizeCountryName(query);

    return entities.filter((entity) =>
      normalizeCountryName(
        [entity.displayNamePtBr, ...entity.aliasesPtBr].join(" ")
      ).includes(normalized)
    );
  }, [query]);

  return (
    <div className="mx-auto w-full max-w-page">
      <PageHeader
        eyebrow="Todas as bandeiras"
        title="Álbum"
        description={`${entities.length} Estados reconhecidos pela ONU, com nomes comuns em português e a origem de cada imagem.`}
      />

      <div className="mb-5 flex flex-wrap gap-3">
        <label className="relative grid min-w-[min(360px,100%)] flex-1 gap-[7px]">
          <span className="sr-only">Buscar por nome</span>
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
            placeholder="Buscar bandeira"
            className="min-h-[50px] w-full rounded-control border border-input bg-surface py-[11px] pr-[14px] pl-[46px] text-ink"
          />
        </label>
      </div>

      <p className="text-ink-soft" aria-live="polite">
        {filtered.length} {filtered.length === 1 ? "resultado" : "resultados"}
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-card border border-dashed border-input p-11 text-center text-ink-soft">
          Nenhuma bandeira corresponde à busca.
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4 max-lg:grid-cols-2 max-md:grid-cols-1">
          {filtered.map((entity) => (
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
                  {entity.region}
                </span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
