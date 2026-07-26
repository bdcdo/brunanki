import { BrandLink } from "@/components/BrandMark";
import { SkipLink } from "@/components/SkipLink";

/**
 * Casca das rotas de sessão: `/estudar` e `/diagnostico`.
 *
 * Sem barra lateral. Durante um exercício a sidebar rouba 254px de largura da
 * bandeira, que é exatamente o artefato que a pessoa precisa examinar — e a
 * navegação para outras cinco telas convida a sair no meio de uma sessão de
 * repetição espaçada, que é quando sair custa mais caro.
 *
 * Deliberadamente sem barra de progresso própria: ela depende de quantos itens
 * a sessão tem e em qual a pessoa está, e só o componente de sessão sabe isso
 * — ele já a renderiza. Uma aqui seria a segunda na tela.
 *
 * A marca é a única saída, e é por isso que ela está aqui: sem sidebar e sem
 * navegação, uma tela de sessão sem nenhum caminho de volta seria um beco.
 */
export function SessionShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <SkipLink />
      <header className="flex items-center px-4.5 pt-6 md:px-gutter md:pt-8">
        <BrandLink />
      </header>
      {/* min-w-0 no elemento que centraliza: sem ele, um filho que não encolhe
          — o nome longo de uma alternativa, por exemplo — empurra a largura
          para além da viewport e derruba o gate de overflow horizontal. */}
      <main
        id="main"
        className="mx-auto min-w-0 max-w-narrow px-4.5 pt-7 pb-16 md:px-gutter md:pt-10 md:pb-20"
      >
        {children}
      </main>
    </div>
  );
}
