"use client";

import { DatabaseBackup } from "lucide-react";
import Link from "next/link";

/**
 * Exibida enquanto o armazenamento local ainda não respondeu. É um estado
 * distinto de "sem progresso": confundir os dois faria a interface anunciar
 * zero revisões antes de saber se há alguma.
 */
export function LoadingScreen({ label }: { label: string }) {
  return (
    <div className="page" aria-busy="true">
      <p className="sr-only" role="status">
        {label}
      </p>
      <div className="card">
        <p className="muted">{label}</p>
      </div>
    </div>
  );
}

/**
 * Exibida quando o IndexedDB não pôde ser aberto — janela anônima, cota
 * esgotada, armazenamento bloqueado pelo navegador.
 *
 * Deliberadamente não oferece refazer o diagnóstico nem apagar dados: o
 * progresso provavelmente continua lá, apenas inacessível agora, e a ação
 * mais destrutiva não pode ser a mais à mão. O catálogo é estático e
 * funciona sem armazenamento, então é um destino útil.
 */
export function StorageUnavailableScreen({ error }: { error: Error }) {
  return (
    <div className="page page-narrow">
      <header className="page-header">
        <div>
          <span className="eyebrow">Armazenamento local</span>
          <h1>Seu progresso não pôde ser lido</h1>
          <p>
            Não foi possível abrir o banco de dados deste navegador. Seu
            progresso não foi apagado — ele pode estar apenas inacessível numa
            janela anônima, com a cota de armazenamento esgotada ou com o
            armazenamento bloqueado para este site.
          </p>
        </div>
      </header>

      <section className="card">
        <div className="section-heading">
          <DatabaseBackup size={22} aria-hidden="true" />
          <h2>O que dá para fazer agora</h2>
        </div>
        <p className="muted">
          Abra o Brunanki numa janela normal do mesmo navegador, ou libere o
          armazenamento para este site nas configurações. Enquanto isso, o
          catálogo continua disponível: ele não depende de armazenamento.
        </p>
        <p style={{ marginTop: 16 }}>
          <Link className="button button-secondary" href="/catalogo">
            Ver o catálogo de bandeiras
          </Link>
        </p>
      </section>

      <details style={{ marginTop: 18 }}>
        <summary className="muted">Detalhe técnico</summary>
        <p className="muted">{error.message}</p>
      </details>
    </div>
  );
}
