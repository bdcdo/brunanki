/**
 * Atalho para o conteúdo, escondido até receber foco.
 *
 * Compartilhado pelas duas cascas: o alvo `#main` é o `<main>` que cada uma
 * declara, e é por isso que nenhuma delas pode deixar de declarar o seu.
 *
 * Fora da tela por `translate`, e não por `display: none` ou `visibility`:
 * qualquer um dos dois o tiraria da ordem de tabulação, que é o único jeito de
 * alcançá-lo. Deliberadamente sem `no-underline` — ele é um link de texto, e o
 * sublinhado que o `@layer base` devolve a todo `<a>` vale aqui também.
 */
export function SkipLink() {
  return (
    <a
      className="fixed top-3 left-3 z-[100] -translate-y-[150%] rounded-lg bg-ink px-4 py-2.5 text-white focus:translate-y-0"
      href="#main"
    >
      Pular para o conteúdo
    </a>
  );
}
