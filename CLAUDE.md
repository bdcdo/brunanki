# brunanki

Aplicativo web em pt-BR para conquistar domínios delimitados de conhecimento. A primeira e única coleção é a das bandeiras dos Estados-membros e dos observadores permanentes da ONU; a contagem sai do catálogo, e nenhum texto a fixa. Nenhum outro domínio entra antes de bandeiras funcionar muito bem.

A razão de cada decisão estrutural fica no comentário do código que ela governa, com o número da decisão (ADR-000N) quando há uma. Os documentos originais de especificação e de decisão foram retirados da árvore e continuam recuperáveis no histórico do git.

## Comandos

Node 20 ou mais recente e pnpm. `pnpm install`, `pnpm dev`.

Antes de commitar, rode os gates nesta ordem: `data:validate` → `typecheck` → `lint` → `test:coverage` → `build` → `test:e2e`. Os quatro primeiros são os que o CI roda, e a lista canônica deles é `.github/workflows/ci.yml`; se este arquivo divergir dele, o workflow vence.

Dois cuidados que já custaram uma sessão de depuração cada. O `build` não pode rodar com um `next start` de pé, porque o e2e falha imitando uma regressão de CSS. E os testes visuais precisam forçar o carregamento de todas as bandeiras antes de capturar a tela, porque a carga é preguiçosa.

## Fronteiras que não se cruzam

**`src/domain/**` é puro.** Sem React, sem Dexie, sem DOM. Só importa de `@/types`, de si mesmo e do `ts-fsrs`. Relógio e sorteio entram por parâmetro — `now: Date = new Date()`, `random: RandomSource = Math.random` — e é isso, e não disciplina de quem escreve teste, que torna agendador, fila e distratores reproduzíveis sob semente. A única leitura de ambiente é `resolveTimeZone()`, resolvida uma vez e persistida nas preferências, para que viajar não reclassifique o histórico.

**`src/data/catalog.ts` é `server-only`.** Ele carrega 400 KB de procedência, licença e hash por arquivo, que o navegador não tem por que baixar. O cliente enxerga apenas `src/data/runtime-catalog.ts`. Se um campo não está em `RuntimeEntity`, ele não chega ao navegador — e a saída não é acrescentá-lo ali por conveniência, é perguntar por que a interface precisa de procedência.

**`src/storage/**` só se alcança por `await import("@/storage")` dentro do handler.** Import no topo de um módulo de interface põe o Dexie no bundle inicial de quem ainda nem começou a estudar.

**Regra de domínio não se reimplementa em componente.** Já aconteceu: `/progresso` reescreveu o critério de domínio em prosa e divergiu de `src/domain/mastery.ts`. Componente consome a razão que o domínio devolve; não recalcula o limiar nem o transcreve no texto da tela.

**Artefatos gerados não se editam à mão.** `src/data/catalog.json`, `src/data/runtime-catalog.json` e `public/flags/**` mudam por `pnpm data:refresh` seguido de revisão do diff — o refresh nunca publica por conta própria. A exceção é o currículo editorial, que é escrito à mão e validado por `pnpm data:validate`.

**O piso de cobertura sobe e nunca desce.** O número e sua razão estão em `vitest.config.ts`. Se uma mudança sua o derruba, escreva o teste que faltava — inclusive em arquivo que a tarefa não tocou.

## Idioma

Interface, comentários, mensagens de commit e documentos em pt-BR, com acentuação correta. Identificadores em inglês: `flagToNameRecall`, `entityId`, `confusability`. Não há exceção nem meio-termo — nome de variável em português é tão fora do padrão quanto comentário em inglês.

## Commits

Uma linha em pt-BR, inicial minúscula, presente do indicativo, descrevendo o efeito no produto e não a mecânica da edição: "trata os três estados do armazenamento uma vez", não "refatora AppProvider". Uma ideia por commit. Sem Conventional Commits, sem escopo entre parênteses, sem emoji. O corpo, quando existir, explica por que a mudança era necessária. O `git log` é a referência de estilo.

## Comentários

Esta é a convenção mais distintiva do repositório e a que mais se perde sem instrução escrita.

Um comentário justifica a escolha nomeando o defeito que ela torna inexprimível — por que a ordem das operações importa, qual parte de uma estrutura composta garante a unicidade e qual só serve de verificação, que efeito colateral a alternativa teria. Ele nunca parafraseia o código nem explica conceito geral de linguagem ou de runtime, que se aprende uma vez e não precisa de reforço.

Comentário não duplica fato que vive em outro lugar: em vez de copiar uma lista de valores, referencie o símbolo canônico, senão o comentário desatualiza em silêncio quando a fonte muda. Um número que o código lê mora no código; o documento nomeia a constante e explica sua razão sem transcrever o valor.

Comentário que registra decisão revogada não é apagado em silêncio: vira ponteiro para o ADR que a revogou. Limitação conhecida e rastreada aponta para a issue.

## Acessibilidade é gate, não polimento

O e2e reprova violações `serious` e `critical` do axe em toda tela, e mede transbordo horizontal em desktop e em celular. Além disso: navegação completa por teclado; `aria-live` no veredito, não no cartão inteiro; toda alternativa distinguível por leitor de tela, inclusive a grade de bandeiras, que depende de `describePalette` para não ser uma fileira de imagens mudas; texto alternativo que nunca revela a resposta durante a pergunta — daí `FlagImage` exigir um `alt` tipado em vez de aceitar string livre; contraste medido, não estimado; e nada codificado só por cor.

## Um jeito óbvio e só um

O princípio proíbe caminhos redundantes para o mesmo resultado, e não atividades distintas que produzam evidências distintas. O teste operacional: um exercício novo precisa produzir uma evidência que nenhum exercício existente produz, ou é recusado.

## Nunca neste produto

Ranking global, comparação entre pessoas, sequência diária punitiva, notificação agressiva, recompensa aleatória, tempo de uso como medida de identidade.

Domínio marcado por um único acerto ou por tela concluída. Conquista que descreve atividade em vez de capacidade.

Conta obrigatória, backend de progresso, telemetria de terceiros, publicidade comportamental.

Hotlink de imagem em runtime: toda mídia é fixada no repositório, com licença e atribuição registradas.

Decisão editorial controversa apresentada na interface como verdade incontestável.

Estratégia de ensino que se sabe pior, adotada porque é mais fácil de implementar.
