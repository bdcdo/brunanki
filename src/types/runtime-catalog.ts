import type { ColorNamePtBr } from "@/domain/palette";
import type { Region } from "@/types/region";

/**
 * A parte do catálogo que o navegador precisa.
 *
 * O catálogo completo tem procedência: identificadores externos, URLs de
 * origem, hashes, licenças, datas de verificação. Nada disso é usado para
 * estudar, mas tudo isso viajava até o navegador em toda rota porque um único
 * módulo exportava as duas coisas. Este contrato é o corte: se um campo não
 * aparece aqui, ele não chega ao cliente.
 *
 * Sem nenhum import de `@/types/catalog`, e isso é o ponto: enquanto `Organization`
 * era projetada para cá, o contrato de runtime dependia do vocabulário do
 * artefato completo. Toda entidade é filiada à ONU — o campo não distinguia
 * ninguém de ninguém. `Region` é compartilhada com o catálogo completo, e por
 * isso mesmo vive em módulo próprio: ela é vocabulário de interface, não de
 * procedência, e nenhum dos dois artefatos é dono dela.
 */
export interface RuntimeEntity {
  readonly id: string;
  readonly displayNamePtBr: string;
  readonly aliasesPtBr: readonly string[];
  readonly region: Region;
  /** Obrigatório: uma entidade sem bandeira não é construível. */
  readonly flagPath: string;
  /**
   * Cores da bandeira, quantizadas. Alimenta a escolha de distratores
   * confundíveis e a descrição para leitor de tela. Nunca vazia.
   */
  readonly palette: readonly ColorNamePtBr[];
  readonly editorialNote?: string;
}

export interface RuntimeCatalog {
  readonly version: string;
  readonly entities: readonly RuntimeEntity[];
}
