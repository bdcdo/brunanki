import type { ReactNode } from "react";

import { Eyebrow } from "@/components/ui/eyebrow";
import { cn } from "@/lib/utils";

/**
 * A abertura de uma tela de navegação: rótulo, título e uma linha de contexto.
 *
 * Vira componente porque as sete telas que a usam já tinham exatamente esta
 * forma — `<header><div><span/><h1/><p/></div></header>` —, com as três regras
 * de descendente (`.page-header h1`, `.page-header p`) presas à estrutura. Um
 * conjunto de utilitários soltos as devolveria a cada chamada e deixaria o
 * `<h1>` de cada tela livre para divergir em tamanho, que é a divergência que
 * a escala tipográfica existe para impedir.
 *
 * `items-end` e `justify-between` sobrevivem sem um segundo filho: são o que
 * permite alinhar uma ação à direita do título sem reescrever a casca.
 *
 * O `<h1>` não repete `text-page`? Repete — e precisa. `--text-page` traz o
 * 1,04 de `--lead-page` junto com o `clamp(38px, 5vw, 62px)`, que é o mesmo
 * par que a regra legada declarava em duas linhas separadas.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  className
}: {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "mb-[30px] flex items-end justify-between gap-6 max-md:flex-col max-md:items-start",
        className
      )}
    >
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="font-title text-page font-bold tracking-page">
          {title}
        </h1>
        {description && (
          <p className="mt-2.5 mb-0 max-w-copy text-ink-soft">{description}</p>
        )}
      </div>
    </header>
  );
}
