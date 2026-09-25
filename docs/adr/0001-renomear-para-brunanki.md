# ADR-0001 — Renomear o produto para brunanki e quebrar a compatibilidade dos backups

**Estado:** aceita
**Data:** 2026-07-26

## Contexto

O projeto nasceu como `ptanki`, nome provisório que a spec registrava como questão em aberto. O nome definitivo é **brunanki**.

Renomear a marca seria trivial. O problema é que o nome não vivia só na marca: estava em `DATABASE_NAME`, o nome do banco IndexedDB de onde sai todo o progresso, e no campo `format` de cada backup exportado, que é o gate de identidade do arquivo na importação. Trocar esses dois invalida o progresso local de quem já usa o aplicativo e todo arquivo já exportado.

Cabe registrar a tensão com o nome escolhido: a spec é explícita em não querer ser um clone do Anki nem um repositório genérico de flashcards, e o nome evoca justamente isso. A decisão de produto foi tomada de olhos abertos — o nome é uma brincadeira com o autor e com a referência óbvia, não uma declaração de arquitetura.

## Decisão

O nome muda em todos os lugares, inclusive nos identificadores persistidos: o banco passa a se chamar `brunanki` e o formato de backup, `brunanki-export`. **Não há caminho de migração.** O progresso local anterior torna-se inalcançável e os backups antigos passam a ser recusados na importação.

## Alternativas descartadas

**Manter `ptanki` como identificador persistido, renomeando só o que é visível.** Custo zero e resultado permanente: um nome morto no coração do armazenamento, que exigiria um comentário explicativo a cada leitura do arquivo e que só ficaria mais caro de trocar com o tempo.

**Renomear com migração — copiar o banco antigo na primeira abertura e aceitar `ptanki-export` como formato legado.** É a alternativa tecnicamente correta e foi descartada por proporção: o aplicativo não foi publicado para terceiros, a base de usuários é o próprio autor, e a tela de ajustes já oferece exportar antes de atualizar. Escrever, testar e manter um caminho de compatibilidade para um único usuário que pode simplesmente recomeçar é máquina em cima de um problema que não existe.

## Consequências

Quem tinha progresso no navegador recomeça. Backups emitidos antes desta mudança não são mais legíveis por nenhuma versão do aplicativo — a recusa é explícita, no primeiro campo validado, e está fixada em teste.

Com o formato renomeado, o esquema v1 do backup deixou de descrever qualquer arquivo que tenha existido: ele exigia o `format` novo combinado com `schemaVersion` antigo. Saiu do código junto com a função de migração que o alimentava. O que resta é uma única forma legível, e `schemaVersion` continua sendo validado por literal para que um arquivo de versão futura falhe de forma explícita em vez de ser aceito e perder campos em silêncio.

O repositório no GitHub e o aplicativo no Fly.io são renomeados junto. O Fly não tem operação de renomear aplicativo: é preciso criar um novo, migrar o deploy e destruir o antigo, o que arrasta o token de deploy usado pelo CI, escopado por aplicativo.
