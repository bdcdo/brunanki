import { X } from "lucide-react";
import Link from "next/link";

import { SkipLink } from "@/components/SkipLink";

/**
 * Casca das rotas de sessão: `/estudar` e `/diagnostico`.
 *
 * Sem navegação. Durante um exercício a bandeira é o objeto de exame, e cinco
 * destinos à vista convidam a sair no meio de uma sessão de repetição
 * espaçada, que é quando sair custa mais caro.
 *
 * Deliberadamente sem barra de progresso própria: só o componente de sessão
 * sabe quantos itens há e em qual a pessoa está, e ele já a renderiza.
 *
 * "Pausar" é a única saída, e ela precisa existir: uma tela de sessão sem
 * caminho de volta seria um beco. O nome diz o que acontece, porque cada
 * resposta já foi gravada e nada se perde ao sair.
 */
export function SessionShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <SkipLink />
      <header className="mx-auto flex max-w-page items-center px-[18px] pt-4 md:px-gutter md:pt-6">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-2 font-bold no-underline"
        >
          <X size={20} strokeWidth={2.4} aria-hidden="true" />
          Pausar
        </Link>
      </header>
      {/* min-w-0 no elemento que centraliza: sem ele, um filho que não encolhe
          (o nome longo de uma alternativa, por exemplo) empurra a largura
          para além da viewport e derruba o gate de overflow horizontal. */}
      <main
        id="main"
        className="mx-auto min-w-0 max-w-narrow px-[18px] pt-4 pb-16 md:px-gutter md:pt-8 md:pb-20"
      >
        {children}
      </main>
    </div>
  );
}
