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
    <div className="app-frame">
      <SkipLink />
      <header className="mobile-header">
        <BrandLink />
        <button
          ref={toggleRef}
          className="icon-button"
          type="button"
          aria-expanded={open}
          aria-controls="primary-navigation"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </header>

      <aside
        ref={drawerRef}
        tabIndex={-1}
        className={cn(
          open ? "sidebar sidebar-open" : "sidebar",
          // `invisible`, e não apenas o deslocamento que o CSS legado aplica:
          // `visibility: hidden` tira os cinco links da ordem de tabulação e
          // da árvore de acessibilidade. Sem isso eles continuavam
          // alcançáveis por Tab com a gaveta fechada, fora da tela.
          // `md:visible` garante que a coluna do desktop nunca dependa deste
          // estado, que lá não existe.
          !open && "invisible md:visible"
        )}
      >
        <BrandLink className="desktop-brand" />
        <p className="sidebar-kicker">Atlas de memória</p>
        <nav id="primary-navigation" aria-label="Navegação principal">
          {navigation.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/" ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={active ? "nav-link nav-link-active" : "nav-link"}
                aria-current={active ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                <Icon size={20} strokeWidth={2} aria-hidden="true" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-note">
          {/* `text-highlight` porque a regra legada tinha um seletor de
              descendente, `.sidebar .eyebrow`, que trocava o teal por amarelo
              dentro da coluna escura — o teal não alcança contraste sobre
              `--ink`. Como prop, a exceção fica onde ela acontece. */}
          <Eyebrow className="text-highlight">Seu progresso</Eyebrow>
          <strong>Fica neste navegador</strong>
          <p>Sem conta, anúncios ou ranking.</p>
        </div>
      </aside>

      {open && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Fechar menu"
          onClick={() => setOpen(false)}
        />
      )}

      {/* O cerco de foco é `inert` no conteúdo, sem biblioteca: com o principal
          inerte e a gaveta visível, o conjunto focável é botão + gaveta +
          fundo. O cabeçalho fica de fora de propósito, porque o botão vira o
          "X" e precisa continuar alcançável. */}
      <main id="main" className="main-content" inert={open}>
        {children}
      </main>
    </div>
  );
}
