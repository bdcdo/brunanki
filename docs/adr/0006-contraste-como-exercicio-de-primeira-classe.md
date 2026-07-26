# ADR-0006 — Contraste como exercício de primeira classe

**Estado:** aceita, pendente de implementação
**Data:** 2026-07-26

## Contexto

A [spec, §11.3](../SPEC.md) lista quatro modos de exercício obrigatórios no MVP, e o quarto é o contraste de bandeiras confundíveis. Ele não existe, e não por esquecimento: o código registra a recusa deliberadamente, em `src/types/learning.ts`, junto à definição dos exercícios.

> Não existe um exercício de "bandeiras parecidas": a semelhança visual é política de escolha dos distratores (ver `domain/distractors.ts`), aplicada aos exercícios de alternativa. Um exercício à parte seria um segundo jeito de fazer a mesma coisa.

O argumento invoca um princípio que o projeto de fato adota — deve haver um jeito óbvio, e de preferência só um, de fazer qualquer coisa — e é uma leitura razoável dele. A questão é se as duas atividades são mesmo a mesma coisa.

## Decisão

O contraste passa a ser um exercício próprio, `contrastChoice`, sobre pares curados: "qual destas duas é o Chade?". A política de distratores permanece exatamente como está.

O princípio é mantido, na formulação que ele sempre teve: **dois exercícios só coexistem se produzirem evidências diferentes**. O teste operacional é a tabela _exercício → evidência produzida_ de [`HARNESS-VISUAL.md`](../HARNESS-VISUAL.md) — uma proposta que não preenche uma linha nova é recusada.

## Alternativas descartadas

**Manter o contraste apenas como viés de distrator**, que é a posição registrada hoje no código.

Descartada por dois motivos independentes, e qualquer um deles bastaria.

O primeiro é conceitual. Acertar uma questão de alternativas com a Romênia entre as opções produz uma evidência: a Romênia não foi escolhida. Distinguir a Romênia do Chade num par produz outra: a discriminação daquele par específico. A diferença não é de grau. A primeira é compatível com alguém que reconheceu o Chade por eliminação, tendo notado que as outras três opções eram de continentes errados; a segunda não. E é a segunda que o critério de domínio precisa consumir, porque é ela que responde à pergunta que o produto de fato faz — "você sabe esta bandeira?" tem uma resposta diferente de "você sabe esta bandeira quando ela está ao lado da parecida?".

O segundo é empírico, e ataca a premissa de que a política de distratores já cobre o caso. A confundibilidade é calculada sobre paletas quantizadas em nomes de cor, mais a igualdade de região. Chade e Romênia têm exatamente as mesmas três cores, na mesma ordem, na mesma disposição — a medida não tem termo algum que capture a única diferença entre elas, que é o tom do azul. Polônia, Indonésia e Mônaco compartilham as mesmas duas cores e diferem apenas em ordem e proporção, que a medida também não enxerga. Irlanda e Costa do Marfim diferem só na ordem das faixas. A heurística é um bom amostrador de distratores — o que ela foi feita para ser — e um péssimo detector de confusão. Ela não sabe quais pares são difíceis, e por isso não pode ser a base de um treino de discriminação nem de uma explicação de erro.

Curadoria, aqui, não é aprimoramento da métrica: é a coisa que a métrica estava substituindo enquanto não existia.

## Consequências

Entra um tipo de exercício, e com ele o registro de discriminação no estado da habilidade — que é o que [ADR-0007](0007-diagnostico-amostral.md) não toca e o critério de domínio passa a exigir. `mastery.ts` ganha uma razão nova, aplicável apenas a entidades que pertençam a algum grupo curado, para não penalizar bandeiras que não se parecem com nada.

O exercício depende de dado que ainda não existe: os grupos de confusão e o traço que distingue cada par, em `src/data/curriculum.json`. Sem curadoria não há contraste — e é bom que seja assim, porque um contraste gerado por heurística herdaria o defeito que motivou este ADR.

`src/domain/distractors.ts` **não muda**. Ele continua bom no que faz.

O comentário em `src/types/learning.ts` não é apagado: é reescrito para dizer o que passou a valer, apontando para este ADR. Decisão revogada em silêncio é a que volta a ser tomada seis meses depois pelos mesmos motivos.

A implementação está em [`MVP-BACKLOG.md`](../MVP-BACKLOG.md), itens 1 a 4 do P0.
