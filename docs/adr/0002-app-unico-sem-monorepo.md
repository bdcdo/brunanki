# ADR-0002 — Aplicação Next.js única, sem monorepo

**Estado:** aceita
**Data:** 2026-07-26

## Contexto

A [spec, §15.3](../SPEC.md) propõe uma organização em `apps/web` mais um conjunto de pacotes — `core-learning`, `scheduler`, `harness-visual`, `content-schema`, `ui` — com o conteúdo em `content/` e o pipeline em `pipelines/`. A proposta é coerente com o vocabulário do projeto: engine, harness e coleção são conceitos distintos e a separação entre eles é o que permitirá acrescentar um segundo domínio de conhecimento sem reescrever o núcleo.

A situação de fato é outra. Existe um harness, uma coleção e cerca de oito mil linhas de código de produção, das quais boa parte é interface.

## Decisão

Uma única aplicação Next.js com App Router. As fronteiras entre engine, harness e coleção são mantidas como **invariantes verificáveis dentro de `src/`**, não como limites de pacote.

Três delas são reais e têm mecanismo próprio de defesa: `src/domain/**` é puro e recebe relógio e sorteio por parâmetro, o que o torna testável sob semente; `src/data/catalog.ts` é `server-only`, de modo que importá-lo de um componente de cliente quebra o build; e `src/storage/**` só é alcançado por importação dinâmica, para que o Dexie não entre no bundle inicial.

## Alternativas descartadas

**Adotar já a divisão em pacotes da spec.** Exigiria configurar workspaces, referências de TypeScript, build e cobertura por pacote — trabalho de dias — antes de escrever uma linha que melhore o aprendizado de bandeiras. Pior: desenhar fronteiras de pacote com um único harness implementado é desenhá-las a partir de imaginação sobre o segundo, que é o momento em que abstrações erradas se cristalizam.

**Reorganizar `src/` em `engine/`, `harnesses/` e `content/` sem virar monorepo.** Alternativa intermediária, sem o custo de infraestrutura, que torna o vocabulário do projeto visível no caminho dos arquivos. Foi adiada, não rejeitada: é desejável e está registrada como issue. Não entrou agora porque move quase todos os arquivos do repositório e conflitaria com o trabalho de interface em curso, sem entregar nada a quem estuda.

## Consequências

Quem chega ao código não vê o vocabulário da spec na árvore de diretórios: `src/domain` mistura o que a spec chamaria de engine — agendador, fila, domínio — com o que ela chamaria de harness — distratores, resolução de nomes. A ponte é este conjunto de documentos.

As fronteiras dependem de revisão, e uma delas já foi violada uma vez: a tela de progresso reimplementou o critério de domínio e divergiu da regra. A resposta certa não é criar um pacote, é a regra do `CLAUDE.md` — componente consome a razão que o domínio devolve, não recalcula o limiar.

Quando o segundo harness chegar, a reorganização deixa de ser opcional. O sinal para executá-la é concreto: quando um segundo tipo de habilidade precisar de agendamento e o `src/domain` tiver de decidir a qual harness pertence cada arquivo, a fronteira implícita terá se esgotado.
