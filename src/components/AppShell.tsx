"use client";

import { BarChart3, House, LayoutGrid, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { BrandLink } from "@/components/BrandMark";
import { SkipLink } from "@/components/SkipLink";
import { cn } from "@/lib/utils";

/**
 * Estudar não está aqui, e é deliberado: a sessão é o convite da tela Hoje, que
 * diz o que vem a seguir antes de a pessoa entrar. Um segundo caminho para o
 * mesmo lugar, sem esse contexto, seria o jeito redundante que o projeto
 * recusa. Com quatro itens, a barra inferior do celular dá 97px de alvo a
 * cada um na tela de 390px.
 */
const navigation = [
  { href: "/", label: "Hoje", icon: House },
  { href: "/catalogo", label: "Álbum", icon: LayoutGrid },
  { href: "/progresso", label: "Progresso", icon: BarChart3 },
  { href: "/configuracoes", label: "Ajustes", icon: Settings }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-dvh">
      <SkipLink />
      {/* O respiro lateral fica fora da medida, como no <main>: é o que alinha
          a marca com a borda esquerda do conteúdo das páginas. */}
      <header className="border-b border-line bg-surface px-gutter max-md:px-[18px]">
        <div className="mx-auto flex h-[72px] max-w-page items-center gap-10 max-md:h-16">
          <BrandLink className="max-md:text-2xl" />
          {/* Uma navegação só, e não uma por largura: duas <nav> com o mesmo
              rótulo seriam dois marcos idênticos para o leitor de tela. No
              desktop ela é a fileira de abas do cabeçalho; abaixo de 761px ela
              sai do fluxo e vira a barra fixa do rodapé. `fixed` funciona
              dentro do <header> porque nada acima dele cria bloco de
              contenção: sem transform nem filter, a referência é a viewport. */}
          <nav
            aria-label="Navegação principal"
            className={cn(
              "flex h-full gap-1",
              "max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-20 max-md:h-auto max-md:gap-0",
              "max-md:grid max-md:grid-cols-4 max-md:border-t max-md:border-line max-md:bg-surface",
              // A área segura do iPhone fica por baixo da barra, e não por
              // cima dos rótulos: sem este respiro o indicador de início do
              // sistema cobre a palavra "Ajustes".
              "max-md:pb-[env(safe-area-inset-bottom)]"
            )}
          >
            {navigation.map(({ href, label, icon: Icon }) => {
              const active =
                href === "/" ? pathname === href : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center no-underline",
                    // No desktop a aba ativa se marca pelo traço inferior e
                    // pelo peso, não só pela cor: as duas pistas sobrevivem a
                    // quem não distingue o verde da tinta.
                    "h-full border-b-[3px] px-4 pt-[3px]",
                    "max-md:h-bottom-nav max-md:flex-col max-md:justify-center max-md:gap-1 max-md:border-b-0 max-md:border-t-[3px] max-md:px-1 max-md:pt-0 max-md:text-xs",
                    active
                      ? "border-brand font-bold text-ink"
                      : "border-transparent text-ink-soft hover:text-ink"
                  )}
                >
                  <Icon
                    size={22}
                    strokeWidth={active ? 2.4 : 2}
                    aria-hidden="true"
                    className="md:hidden"
                  />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* O respiro do fim no celular soma a barra, a área segura e a folga de
          sempre; sem ele o último botão da página fica atrás da navegação. */}
      <main
        id="main"
        className="px-gutter pt-10 pb-20 max-md:px-[18px] max-md:pt-6 max-md:pb-[calc(var(--bottom-nav)+env(safe-area-inset-bottom)+40px)]"
      >
        {children}
      </main>
    </div>
  );
}
