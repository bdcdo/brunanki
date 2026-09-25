# ADR-0003 — FSRS via `ts-fsrs`, encapsulado no domínio

**Estado:** aceita
**Data:** 2026-07-26

## Contexto

Repetição espaçada é o núcleo do produto, e a qualidade do agendamento é a diferença entre revisar no dia certo e revisar tarde demais. A [spec, §7.3](../SPEC.md) exige que o algoritmo fique atrás de uma interface substituível e que o modelo de dados **não** se acople a uma biblioteca específica.

## Decisão

O agendamento usa FSRS pela biblioteca `ts-fsrs`, com fuzz desligado e retenção desejada configurável. Todo o contato com a biblioteca está confinado a `src/domain/scheduler.ts`: nenhum componente, nenhuma tela e nenhuma outra parte do domínio a importa.

Sobre o algoritmo, o domínio acrescenta o que a biblioteca não modela e o produto exige: a chave `entityId::skill`, que dá cartão próprio a cada direção; a contagem de dias distintos de sucesso no fuso da pessoa, resolvido uma vez e persistido para que viajar não reclassifique o histórico; e a exclusão das correções imediatas dessa contagem, porque acertar a mesma bandeira quatro perguntas depois de errá-la não é evidência de retenção.

## Alternativas descartadas

**SM-2 próprio.** Simples de implementar e de auditar, e sem dependência. Descartado porque significaria escrever, em 2026, um algoritmo que se sabe pior que o disponível — exatamente o tipo de escolha por conveniência técnica que a spec proíbe. O produto pede a melhor programação de revisões que se possa ter.

**Leitner com caixas.** Ainda mais simples, e legível para quem estuda. Descartado pelo mesmo motivo, agravado: caixas não estimam probabilidade de recuperação, e sem essa estimativa não há como dizer que uma bandeira "precisa de revisão" em vez de apenas "está na caixa 3".

## Consequências

A dívida a declarar: o tipo `Card` da biblioteca **vaza**. Ele é armazenado dentro do estado de habilidade e, portanto, aparece no esquema do backup, que precisa validá-lo campo a campo. Isso contraria o que a §7.3 pedia, e foi aceito porque a alternativa — um formato próprio, convertido nas duas pontas — significaria manter uma tradução de estado de agendamento sem nenhum segundo algoritmo à vista para justificá-la.

O custo de trocar de algoritmo, portanto, não é só reescrever o agendador: é migrar os backups já emitidos. O que reduz esse custo é o histórico completo de tentativas, preservado com o estado do agendador antes e depois de cada revisão. Com ele é possível reprocessar a programação inteira sob outro algoritmo em vez de recomeçar do zero — e é essa preservação, não a interface, que torna a decisão de fato reversível.

O fuzz fica desligado para que o agendamento seja reproduzível em teste. A consequência de produto — todas as bandeiras aprendidas no mesmo dia voltarem no mesmo dia — não se manifestou porque as sessões têm poucos itens novos e o vencimento se espalha naturalmente.
