import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible, Big_Shoulders } from "next/font/google";
import "@/app/globals.css";
import { AppProvider } from "@/components/AppProvider";

const bodyFont = Atkinson_Hyperlegible({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "700"]
});

// Condensada e de peso alto, a face dos números de figurinha e dos títulos.
// O eixo `opsz` vai junto porque sem ele o navegador usa o desenho de texto
// corrido, de traço fino, também nos títulos de 70px.
// O next/font não tem métricas da Big Shoulders para ajustar a fonte
// substituta, e sem uma condensada no lugar o título salta de largura quando
// a fonte carrega. As da lista têm proporção parecida onde existem.
const displayFont = Big_Shoulders({
  subsets: ["latin"],
  variable: "--font-display",
  axes: ["opsz"],
  adjustFontFallback: false,
  fallback: ["Arial Narrow", "Roboto Condensed", "sans-serif"]
});

export const metadata: Metadata = {
  title: {
    default: "Brunanki: álbum de bandeiras",
    template: "%s · Brunanki"
  },
  description:
    "Aprenda e revise as bandeiras dos Estados reconhecidos pela ONU.",
  icons: {
    icon: "/favicon.svg",
    apple: "/apple-touch-icon.png"
  }
};

/**
 * O tema é claro por desenho, e agora isso é dito em voz alta.
 *
 * Sem `colorScheme`, o navegador trata a página como indefinida e pinta os
 * controles nativos com a paleta do sistema: em SO escuro, o campo de busca
 * do álbum e o seletor de arquivo do backup abririam escuros dentro de um
 * cartão branco. O par desta declaração é o `color-scheme: light` em
 * globals.css.
 */
export const viewport: Viewport = {
  colorScheme: "light",
  // Sem `cover`, o navegador do iPhone reserva a área segura por conta própria
  // e `env(safe-area-inset-bottom)` vale zero, o que anularia o respiro que a
  // barra inferior do AppShell dá ao indicador de início do sistema.
  viewportFit: "cover",
  themeColor: "#e9edf3"
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
      {/* O provider fica aqui, e não em cada grupo de rotas: as duas sessões
          consomem `useApp()`, então ele precisa envolver os dois. A casca
          visual é que se divide, em (app)/layout.tsx e (session)/layout.tsx. */}
      <body>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
