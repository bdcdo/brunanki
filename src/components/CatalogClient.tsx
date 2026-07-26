"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { FlagImage } from "@/components/FlagImage";
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
    <div className="page">
      <header className="page-header">
        <div>
          <span className="eyebrow">Atlas completo</span>
          <h1>Bandeiras</h1>
          <p>
            {entities.length} Estados reconhecidos pela ONU, com nomes comuns em
            português e a origem de cada imagem.
          </p>
        </div>
      </header>

      <div className="catalog-toolbar">
        <label className="search-field">
          <span className="sr-only">Buscar por nome</span>
          <Search size={20} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar bandeira"
          />
        </label>
      </div>

      <p className="muted" aria-live="polite">
        {filtered.length} {filtered.length === 1 ? "resultado" : "resultados"}
      </p>

      {filtered.length === 0 ? (
        <div className="empty-state">Nenhuma bandeira corresponde à busca.</div>
      ) : (
        <div className="catalog-grid">
          {filtered.map((entity) => (
            <Link
              href={`/catalogo/${entity.id}`}
              className="flag-card"
              key={entity.id}
            >
              <FlagImage entity={entity} alt={{ kind: "named" }} size="card" />
              <span className="flag-card-body">
                <strong>{entity.displayNamePtBr}</strong>
                <span>{entity.region}</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
