"use client";

import {
  BarChart3,
  BookOpen,
  Compass,
  Flag,
  Menu,
  Settings,
  X
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { BrandLink } from "@/components/BrandMark";
import { SkipLink } from "@/components/SkipLink";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/", label: "Hoje", icon: Compass },
  { href: "/estudar", label: "Estudar", icon: BookOpen },
  { href: "/catalogo", label: "Bandeiras", icon: Flag },
  { href: "/progresso", label: "Progresso", icon: BarChart3 },
  { href: "/configuracoes", label: "Ajustes", icon: Settings }
];

/** Complemento exato do `@media (max-width: 760px)` da folha legada. */
const DESKTOP = "(min-width: 761px)";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const drawerRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  /**
   * Fecha a gaveta ao passar para o desktop.
   *
   * Não é cosmético. Com `inert` no conteúdo principal, alargar a janela com a
   * gaveta aberta deixaria o app inteiro inerte no desktop — a gaveta vira
   * coluna fixa, o botão de fechar desaparece, e não sobra nada clicável.
   */
  useEffect(() => {
    const desktop = window.matchMedia(DESKTOP);
    const sync = () => {
      if (desktop.matches) setOpen(false);
    };
    sync();
    desktop.addEventListener("change", sync);
    return () => desktop.removeEventListener("change", sync);
  }, []);

  /** Escape fecha e devolve o foco ao botão que abriu — sem isso o foco fica
   *  órfão num elemento que acabou de sair da tela. */
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      toggleRef.current?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  /** Ao abrir, o foco entra na gaveta. Antes ele continuava no botão e a
   *  primeira tecla Tab caía no conteúdo por baixo. */
  useEffect(() => {
    if (open) drawerRef.current?.focus();
  }, [open]);

  return (
    // Os 254px vivem aqui e em nenhum outro lugar: era a `width` da `<aside>`
    // mais o `margin-left` do `<main>`, dois números que tinham de concordar.
    // O `minmax(0,1fr)` é o que impede o conteúdo de empurrar a coluna — um
    // `1fr` puro tem `min-width: auto` e cresce com o filho mais largo, que é
    // exatamente o estouro horizontal que o e2e persegue.
    <div className="min-h-dvh md:grid md:grid-cols-[254px_minmax(0,1fr)]">
      <SkipLink />
      <header className="sticky top-0 z-[18] flex min-h-[70px] items-center justify-between border-b border-line bg-paper/94 px-[18px] py-2.5 backdrop-blur-[10px] md:hidden">
        <BrandLink className="max-md:text-2xl max-md:leading-body" />
        <Button
          ref={toggleRef}
          variant="secondary"
          size="icon"
          type="button"
          aria-expanded={open}
          aria-controls="primary-navigation"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X /> : <Menu />}
        </Button>
      </header>

      <aside
        ref={drawerRef}
        tabIndex={-1}
        className={cn(
          "z-20 flex flex-col bg-sidebar px-6 pt-[34px] pb-6 text-sidebar-foreground",
          // `sticky`, e não `fixed`, e a diferença é estrutural: um elemento
          // fixo sai do fluxo e deixa de ser item do grid, o que jogaria o
          // `<main>` para a primeira coluna. O `sticky` participa do layout
          // normal — logo, ocupa a coluna — e ainda assim gruda no topo. O
          // `h-dvh` é o que impede a faixa escura de esticar pelos doze mil
          // pixels de `/catalogo`: a célula do grid é alta, o elemento não.
          "md:sticky md:top-0 md:h-dvh",
          "max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:w-[min(310px,86vw)] max-md:transition-transform max-md:duration-[180ms]",
          // `invisible`, e não apenas o deslocamento que o CSS legado aplica:
          // `visibility: hidden` tira os cinco links da ordem de tabulação e
          // da árvore de acessibilidade. Sem isso eles continuavam
          // alcançáveis por Tab com a gaveta fechada, fora da tela.
          // `md:visible` garante que a coluna do desktop nunca dependa deste
          // estado, que lá não existe.
          open
            ? "max-md:translate-x-0"
            : "invisible max-md:-translate-x-[105%] md:visible"
        )}
      >
        <BrandLink className="max-md:hidden" />
        <p className="mt-2 mb-[38px] ml-[49px] text-2xs leading-body font-bold tracking-label text-sidebar-muted uppercase max-md:mb-7 max-md:ml-0">
          Atlas de memória
        </p>
        <nav
          id="primary-navigation"
          aria-label="Navegação principal"
          className="grid gap-[7px]"
        >
          {navigation.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/" ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex min-h-12 items-center gap-3 rounded-control px-3.5 py-3 font-bold no-underline",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground hover:bg-[#ffda72] hover:text-ink"
                    : "text-sidebar-muted hover:bg-white/8 hover:text-white"
                )}
                aria-current={active ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                <Icon size={20} strokeWidth={2} aria-hidden="true" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto rounded-[14px] border border-sidebar-border bg-white/7 p-4">
          {/* `text-highlight` porque a regra legada tinha um seletor de
              descendente, `.sidebar .eyebrow`, que trocava o teal por amarelo
              dentro da coluna escura — o teal não alcança contraste sobre
              `--ink`. Como prop, a exceção fica onde ela acontece. */}
          <Eyebrow className="text-highlight">Seu progresso</Eyebrow>
          <strong className="my-1 block text-sm">Fica neste navegador</strong>
          <p className="m-0 text-xs leading-body text-sidebar-muted">
            Sem conta, anúncios ou ranking.
          </p>
        </div>
      </aside>

      {open && (
        <button
          type="button"
          className="fixed inset-0 z-[19] border-0 bg-[rgb(10_25_28_/_55%)]"
          aria-label="Fechar menu"
          onClick={() => setOpen(false)}
        />
      )}

      {/* O cerco de foco é `inert` no conteúdo, sem biblioteca: com o principal
          inerte e a gaveta visível, o conjunto focável é botão + gaveta +
          fundo. O cabeçalho fica de fora de propósito, porque o botão vira o
          "X" e precisa continuar alcançável. */}
      <main
        id="main"
        className="min-h-dvh px-gutter pt-12 pb-20 max-md:px-[18px] max-md:pt-7 max-md:pb-[60px]"
        inert={open}
      >
        {children}
      </main>
    </div>
  );
}
