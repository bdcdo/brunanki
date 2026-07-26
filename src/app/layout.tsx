import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible, Bricolage_Grotesque } from "next/font/google";
import "@/app/globals.css";
import { AppShell } from "@/components/AppShell";
import { AppProvider } from "@/components/AppProvider";

const bodyFont = Atkinson_Hyperlegible({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "700"]
});

const displayFont = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display"
});

export const metadata: Metadata = {
  title: {
    default: "Ptanki — aprenda todas as bandeiras",
    template: "%s · Ptanki"
  },
  description:
    "Aprenda e revise as bandeiras dos membros da ONU e das associações da FIFA.",
  icons: {
    icon: "/favicon.svg"
  }
};

/**
 * O tema é claro por desenho, e agora isso é dito em voz alta.
 *
 * Sem `colorScheme`, o navegador trata a página como indefinida e pinta os
 * controles nativos com a paleta do sistema: em SO escuro, o <select> de
 * organização do catálogo (CatalogClient.tsx) abria escuro dentro de um cartão
 * creme. O par desta declaração é o `color-scheme: light` em globals.css.
 */
export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#f7f3e9"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // As variáveis de fonte sobem do <body> para o <html> porque o preflight
    // aplica `font-family` no elemento raiz, a partir de --font-sans; no
    // <body> elas ainda não existiriam quando essa regra fosse resolvida.
    <html
      lang="pt-BR"
      className={`${bodyFont.variable} ${displayFont.variable}`}
    >
      <body>
        <AppProvider>
          <AppShell>{children}</AppShell>
        </AppProvider>
      </body>
    </html>
  );
}
