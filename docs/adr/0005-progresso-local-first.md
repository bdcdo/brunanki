# ADR-0005 — Progresso local-first, exportável, sem conta

**Estado:** aceita
**Data:** 2026-07-26

## Contexto

Um aplicativo de repetição espaçada precisa guardar estado por muito tempo: o valor aparece justamente na revisão de daqui a três meses. Isso costuma justificar conta de usuário e backend desde o primeiro dia.

A spec puxa na direção contrária — coletar apenas o necessário, permitir uso local sem conta no MVP, sem publicidade e sem rastreamento — e há uma razão de produto mais forte que a de privacidade: exigir cadastro antes do primeiro exercício é o filtro mais eficiente que existe contra alguém experimentar o aplicativo.

## Decisão

Todo o progresso vive no IndexedDB do navegador, via Dexie. Não há conta, backend, sincronização nem telemetria. O transporte entre dispositivos é um backup JSON versionado, exportado e restaurado pela tela de ajustes.

O modelo de dados é escrito para não pressupor a ausência de conta: o estado é identificado por entidade e habilidade, e o histórico de tentativas é preservado com o estado do agendador antes e depois de cada revisão. Acrescentar sincronização depois é acrescentar transporte, não redesenhar o modelo.

## Alternativas descartadas

**Backend com conta desde o início.** Resolveria sincronização, permitiria analisar dados de aprendizagem de verdade e daria durabilidade real ao progresso. Descartado por três razões somadas: introduz cadastro antes do primeiro exercício; cria custo operacional permanente num projeto gratuito e não comercial; e passa a exigir uma política de dados de menores de idade que a spec deixa explicitamente como pré-requisito de qualquer recurso social, sem que haja qualquer recurso social a oferecer.

**`localStorage` em vez de IndexedDB.** Mais simples e sem dependência. Descartado pelo volume: são 220 entidades × 2 habilidades de estado, mais um histórico de tentativas que só cresce, e `localStorage` é síncrono, limitado a poucos megabytes e obrigaria a serializar tudo a cada resposta.

## Consequências

O progresso é frágil e é honesto dizer isso: limpar dados do navegador o apaga, navegação anônima não o preserva, e trocar de dispositivo exige exportar e importar à mão. O aplicativo detecta o caso em que o armazenamento não está disponível e explica, em vez de falhar em silêncio — é o que acontece em janela anônima.

O backup é o único ponto por onde dados entram no sistema vindos de fora, e por isso é validado campo a campo, com regras que vão além do formato: o identificador do estado tem de corresponder ao par entidade × habilidade, um diagnóstico incompleto não pode alegar data de conclusão, exercícios que nenhum código jamais gerou são recusados. Antes de substituir o estado atual, a importação salva um backup do que existia.

Não há dado de aprendizagem agregado para observar. As perguntas que a spec faz na seção de métricas — retenção após intervalo, redução de confusões específicas, desempenho em exemplares novos — não têm como ser respondidas com base em usuários reais, apenas raciocinadas. É o preço, e ele foi aceito.

A questão de quando introduzir conta e sincronização continua aberta na spec. Este ADR fixa apenas que o modelo de progresso não a pressupõe.
