# Registros de decisão de arquitetura

Um ADR existe quando **uma alternativa real foi descartada** e a escolha tem consequência que sobrevive a quem a tomou. Preferência sem alternativa não é decisão, é convenção, e o lugar dela é o [`CLAUDE.md`](../../CLAUDE.md).

O teste é simples: se você não consegue escrever a seção "alternativas descartadas" com algo que de fato se considerou, não há ADR a escrever.

Um ADR não é apagado nem editado quando a decisão muda. Escreve-se outro, que o supera, e o antigo ganha um aviso apontando para o sucessor — o valor do registro está justamente em preservar o raciocínio de quem decidiu com a informação que tinha. Pelo mesmo motivo, comentário no código que registra decisão revogada vira ponteiro para o ADR que a revogou, nunca é removido em silêncio.

| #                                                           | Decisão                                                                  | Estado                            |
| ----------------------------------------------------------- | ------------------------------------------------------------------------ | --------------------------------- |
| [0001](0001-renomear-para-brunanki.md)                      | Renomear o produto para brunanki e quebrar a compatibilidade dos backups | Aceita                            |
| [0002](0002-app-unico-sem-monorepo.md)                      | Aplicação Next.js única, sem monorepo                                    | Aceita                            |
| [0003](0003-fsrs-via-ts-fsrs.md)                            | FSRS via `ts-fsrs`, encapsulado no domínio                               | Aceita                            |
| [0004](0004-escopo-onu-fifa-santa-se.md)                    | Escopo da coleção: ONU, FIFA e a Santa Sé                                | Aceita                            |
| [0005](0005-progresso-local-first.md)                       | Progresso local-first, exportável, sem conta                             | Aceita                            |
| [0006](0006-contraste-como-exercicio-de-primeira-classe.md) | Contraste como exercício de primeira classe                              | Aceita, pendente de implementação |
| [0007](0007-diagnostico-amostral.md)                        | Diagnóstico amostral no lugar do censo                                   | Aceita, pendente de implementação |

Os cinco primeiros são retroativos: registram decisões que já são verdade no código e que nunca tinham sido escritas. Os dois últimos são prospectivos e revertem comportamento embarcado — o backlog que os implementa está em [`../MVP-BACKLOG.md`](../MVP-BACKLOG.md).
