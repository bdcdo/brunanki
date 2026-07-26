import type { Organization } from "./catalog";

/**
 * A parte do catálogo que o navegador precisa.
 *
 * O catálogo completo tem procedência: identificadores externos, URLs de
 * origem, hashes, licenças, datas de verificação. Nada disso é usado para
 * estudar, mas tudo isso viajava até o navegador em toda rota porque um único
 * módulo exportava as duas coisas. Este contrato é o corte: se um campo não
 * aparece aqui, ele não chega ao cliente.
 */
export interface RuntimeEntity {
  readonly id: string;
  readonly displayNamePtBr: string;
  readonly aliasesPtBr: readonly string[];
  readonly region: string;
  readonly organizations: readonly Organization[];
  /** Obrigatório: uma entidade sem bandeira não é construível. */
  readonly flagPath: string;
  readonly editorialNote?: string;
}

export interface RuntimeCatalog {
  readonly version: string;
  readonly entities: readonly RuntimeEntity[];
}
