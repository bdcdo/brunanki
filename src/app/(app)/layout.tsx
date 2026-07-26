import { AppShell } from "@/components/AppShell";

/**
 * Casca das rotas de navegação — as cinco do menu, mais créditos e o detalhe
 * de cada bandeira.
 *
 * O grupo `(app)` não entra no caminho da URL, então nenhum endereço muda por
 * causa desta separação: `/catalogo` continua sendo `/catalogo`, o
 * `generateStaticParams` das 220 páginas de detalhe segue intacto e o e2e não
 * precisou de um ajuste.
 */
export default function AppRoutesLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return <AppShell>{children}</AppShell>;
}
