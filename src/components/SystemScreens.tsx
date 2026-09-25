"use client";

import { DatabaseBackup } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
import {
  CardHeader,
  CardTitle,
  cardVariants,
  sessionCard
} from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";

/**
 * Exibida enquanto o armazenamento local ainda não respondeu. É um estado
 * distinto de "sem progresso": confundir os dois faria a interface anunciar
 * zero revisões antes de saber se há alguma.
 */
export function LoadingScreen({ label }: { label: string }) {
  return (
    <div className="mx-auto w-full max-w-page" aria-busy="true">
      <p className="sr-only" role="status">
        {label}
      </p>
      <div className={cardVariants()}>
        <p className="text-ink-soft">{label}</p>
      </div>
    </div>
  );
}

/**
 * Exibida quando o IndexedDB não pôde ser aberto — janela anônima, cota
 * esgotada, armazenamento bloqueado pelo navegador.
 *
 * Deliberadamente não oferece apagar dados: o
 * progresso provavelmente continua lá, apenas inacessível agora, e a ação
 * mais destrutiva não pode ser a mais à mão. O catálogo é estático e
 * funciona sem armazenamento, então é um destino útil.
 */
export function StorageUnavailableScreen({ error }: { error: Error }) {
  return (
    <div className="mx-auto w-full max-w-narrow">
      <PageHeader
        eyebrow="Armazenamento local"
        title="Seu progresso não pôde ser lido"
        description="Não foi possível abrir o banco de dados deste navegador. Seu progresso não foi apagado — ele pode estar apenas inacessível numa janela anônima, com a cota de armazenamento esgotada ou com o armazenamento bloqueado para este site."
      />

      <section className={cardVariants()}>
        <CardHeader>
          <DatabaseBackup size={22} aria-hidden="true" />
          <CardTitle>O que dá para fazer agora</CardTitle>
        </CardHeader>
        <p className="text-ink-soft">
          Abra o Brunanki numa janela normal do mesmo navegador, ou libere o
          armazenamento para este site nas configurações. Enquanto isso, o
          catálogo continua disponível: ele não depende de armazenamento.
        </p>
        <p className="mt-4">
          <Link
            className={buttonVariants({ variant: "secondary" })}
            href="/catalogo"
          >
            Ver o catálogo de bandeiras
          </Link>
        </p>
      </section>

      <details className="mt-[18px]">
        <summary className="text-ink-soft">Detalhe técnico</summary>
        <p className="text-ink-soft">{error.message}</p>
      </details>
    </div>
  );
}

/**
 * Tela inteira para quando não há o que fazer agora: nenhuma revisão vencida
 * e nenhuma bandeira nova a introduzir.
 *
 * É de página, com `h1` próprio, e não um aviso embutido numa lista. A caixa
 * tracejada de "nenhum resultado" do catálogo continua onde está de propósito:
 * ali o vazio é do filtro, a página tem título e conteúdo em volta, e dar um
 * `h1` àquele trecho quebraria a hierarquia de cabeçalhos que o axe verifica.
 * São dois conceitos, não duas cópias do mesmo.
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
    <div className="mx-auto w-full max-w-narrow">
      <section className={cn(sessionCard, "text-center")}>
        {icon && (
          <div className="mt-[30px] mb-3.5 flex justify-center">{icon}</div>
        )}
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h1 className="m-0 font-title leading-page font-bold tracking-page">
          {title}
        </h1>
        <p className="text-ink-soft">{description}</p>
        {action && <div className="mt-[18px]">{action}</div>}
      </section>
    </div>
  );
}
