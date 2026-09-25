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
import { useState } from "react";

const navigation = [
  { href: "/", label: "Hoje", icon: Compass },
  { href: "/estudar", label: "Estudar", icon: BookOpen },
  { href: "/catalogo", label: "Bandeiras", icon: Flag },
  { href: "/progresso", label: "Progresso", icon: BarChart3 },
  { href: "/configuracoes", label: "Ajustes", icon: Settings }
];

function Mark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="app-frame">
      <a className="skip-link" href="#main">
        Pular para o conteúdo
      </a>
      <header className="mobile-header">
        <Link href="/" className="brand" aria-label="Brunanki — início">
          <Mark />
          <strong>brunanki</strong>
        </Link>
        <button
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

      <aside className={open ? "sidebar sidebar-open" : "sidebar"}>
        <Link
          href="/"
          className="brand desktop-brand"
          aria-label="Brunanki — início"
        >
          <Mark />
          <strong>brunanki</strong>
        </Link>
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
          <span className="eyebrow">Seu progresso</span>
          <strong>Fica neste navegador</strong>
          <p>Sem conta, anúncios ou ranking.</p>
        </div>
        <Link href="/creditos" className="sidebar-footer">
          Fontes e créditos
        </Link>
      </aside>

      {open && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Fechar menu"
          onClick={() => setOpen(false)}
        />
      )}

      <main id="main" className="main-content">
        {children}
      </main>
    </div>
  );
}
