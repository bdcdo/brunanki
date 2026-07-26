/**
 * Atalho para o conteúdo, escondido até receber foco.
 *
 * Compartilhado pelas duas cascas: o alvo `#main` é o `<main>` que cada uma
 * declara, e é por isso que nenhuma delas pode deixar de declarar o seu.
 */
export function SkipLink() {
  return (
    <a className="skip-link" href="#main">
      Pular para o conteúdo
    </a>
  );
}
