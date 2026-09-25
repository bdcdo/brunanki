import { SessionShell } from "@/components/SessionShell";

/**
 * Casca da rota de sessão, estudar.
 *
 * A separação existe porque as duas telas têm uma exigência que as outras não
 * têm: a bandeira é o objeto de exame, e cada pixel de largura tirado dela
 * atrapalha o que a pessoa foi ali fazer.
 */
export default function SessionRoutesLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return <SessionShell>{children}</SessionShell>;
}
