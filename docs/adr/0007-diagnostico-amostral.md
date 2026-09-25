# ADR-0007 — Diagnóstico amostral no lugar do censo

**Estado:** aceita, pendente de implementação
**Data:** 2026-07-26

## Contexto

O diagnóstico atual percorre **todas as 220 entidades**, uma vez cada, com resposta digitada ou pulo. É retomável, persiste entre sessões e é **obrigatório**: `/estudar` fica bloqueado até que ele termine.

A intenção era boa e é a de qualquer teste de nivelamento: descobrir o que a pessoa já sabe para não ensinar o que ela sabe. O que o censo entrega, porém, é a medida exata em troca do custo mais alto possível — meia hora de digitação antes do primeiro exercício útil, num aplicativo cuja proposta é ser divertido.

A [spec, §7.5](../SPEC.md) já pedia outra coisa: amostrar subgrupos, usar poucas questões por item no início, aumentar ou reduzir a cobertura adaptativamente, diferenciar reconhecimento de recuperação, e permitir pular conteúdo claramente conhecido programando verificações futuras. O censo atende um desses cinco pontos.

## Decisão

O diagnóstico passa a ser uma amostra estratificada por região, de algumas dezenas de itens, que aprofunda apenas onde a incerteza justificar. Entidades não amostradas entram como não vistas.

E deixa de ser obrigatório: `/estudar` funciona sem diagnóstico nenhum.

## Alternativas descartadas

**Manter o censo, tornando-o opcional.** Resolveria o bloqueio com uma linha de código e preservaria a medida exata para quem quisesse. Descartado porque o censo continuaria errado nas outras duas frentes — mede uma direção só, deixando a segunda habilidade sem estimativa alguma, e não é adaptativo. E "opcional" na prática significa "ninguém faz", o que devolve todo mundo à estimativa zero.

**Eliminar o diagnóstico.** Toda bandeira começa como não vista e o agendador se encarrega. Simples, e defensável: FSRS converge rápido. Descartado porque desperdiça o que a pessoa já sabe — quem já reconhece metade das bandeiras europeias seria obrigado a "aprender" cada uma delas — e porque o diagnóstico é justamente o momento em que o produto demonstra que leva a sério a diferença entre exposição e domínio.

## Consequências

Perde-se a medida exata de entrada. Ganha-se uma entrada de minutos, a estratificação que a spec exige, e a possibilidade de estudar antes de medir.

A regra que impede o barateamento de virar mentira: uma entidade não amostrada entra como **não vista**, jamais como conhecida. Um diagnóstico pode poupar trabalho; não pode inventar domínio. Pela mesma razão, um único acerto na amostra não marca nada como dominado — ele cria o cartão, e o critério de domínio segue exigindo o que sempre exigiu.

Há um efeito colateral que não é sobre pedagogia. É por causa do portão de 220 itens que a suíte de ponta a ponta nunca conseguiu exercitar uma sessão de estudo: nenhum teste consegue atravessar o diagnóstico em tempo razoável, e por isso a tela de exercício — incluindo suas verificações de acessibilidade — nunca foi testada de verdade. Remover o bloqueio destrava a cobertura das duas telas que ensinam.

A amostragem precisa ser determinística sob semente, ou o teste que garante a estratificação não existe.

A implementação está em [`MVP-BACKLOG.md`](../MVP-BACKLOG.md), item 5 do P0.
