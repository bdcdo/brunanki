"use client";

import { DatabaseBackup } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

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
          Abra o Ptanki numa janela normal do mesmo navegador, ou libere o
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

/**
 * Tela inteira para quando não há o que fazer agora — o diagnóstico ainda não
 * foi feito, ou não há revisão vencida.
 *
 * É de página, com `h1` próprio, e não um aviso embutido numa lista. A caixa
 * tracejada de "nenhum resultado" do catálogo continua onde está de propósito:
 * ali o vazio é do filtro, a página tem título e conteúdo em volta, e dar um
 * `h1` àquele trecho quebraria a hierarquia de cabeçalhos que o axe verifica.
 * São dois conceitos, não duas cópias do mesmo.
 *
 * O que ela deliberadamente NÃO absorve é a landing de quem ainda não fez o
 * diagnóstico: aquilo não é ausência de conteúdo, é a apresentação do produto.
 */
export function EmptyState({
  icon,
  eyebrow,
  title,
  description,
  action
}: {
  icon?: ReactNode;
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="page page-narrow">
      <section className="study-card text-center">
        {icon && (
          <div className="mt-[30px] mb-3.5 flex justify-center">{icon}</div>
        )}
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1 className="study-title">{title}</h1>
        <p className="muted">{description}</p>
        {action && <div className="mt-[18px]">{action}</div>}
      </section>
    </div>
  );
}
