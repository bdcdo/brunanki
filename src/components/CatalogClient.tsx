"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { FlagImage } from "@/components/FlagImage";
import { entities } from "@/data/catalog";

export function CatalogClient() {
  const [query, setQuery] = useState("");
  const [membership, setMembership] = useState("all");

  const filtered = useMemo(() => {
    const normalized = query
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLocaleLowerCase("pt-BR");

    return entities.filter((entity) => {
      const names = [entity.displayNamePtBr, ...entity.aliasesPtBr]
        .join(" ")
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLocaleLowerCase("pt-BR");
      const organizationMatch =
        membership === "all" ||
        entity.memberships.some(({organization}) => organization === membership);
      return names.includes(normalized) && organizationMatch;
    });
  }, [membership, query]);

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <span className="eyebrow">Atlas completo</span>
          <h1>Bandeiras</h1>
          <p>
            {entities.length} entidades da ONU e da FIFA, com nomes comuns em
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
        <label className="field">
          <span className="sr-only">Filtrar por organização</span>
          <select
            value={membership}
            onChange={(event) => setMembership(event.target.value)}
          >
            <option value="all">ONU e FIFA</option>
            <option value="UN">ONU</option>
            <option value="FIFA">FIFA</option>
          </select>
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
              <FlagImage entity={entity} revealName />
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
