# Backlog do MVP de bandeiras

A meta é uma só: **fazer bandeiras funcionar muito bem**. Nenhum outro domínio de conhecimento entra antes disso. O critério que ordena este backlog não é a facilidade de implementar nem o brilho da tela, e sim uma pergunta única — o que aumenta a probabilidade de alguém, daqui a seis meses, ainda reconhecer as 220 bandeiras.

Não há caixas de seleção aqui. O status de cada item vive nas issues do repositório; caixa de seleção em Markdown apodrece no primeiro merge esquecido. Este documento descreve **o que é o trabalho e como se sabe que ele terminou**.

## Onde estamos

Medido contra os quinze critérios de aceitação da [spec, §25](SPEC.md): **sete atendidos, cinco parciais, três não atendidos**.

Atendidos: uso sem conta; catálogo versionado com fontes e licenças; as duas direções de exercício; aliases e variações na resposta digitada; estado e agendamento por habilidade; persistência entre sessões; ausência de ranking, sequência punitiva e criação de desafios.

Parciais: o diagnóstico existe mas é censitário e bloqueante; a sessão combina revisão e novidade mas não confusão; o progresso conhece o estado por habilidade e só exibe agregados; os testes cobrem domínio e armazenamento e não cobrem as duas telas que ensinam.

Não atendidos: prática de contraste entre confundíveis; trilha regional; conquista baseada em evidência de domínio.

Os três não atendidos e dois dos parciais são o P0 abaixo. Não por acaso: eles são o que separa "reconhecer 220 bandeiras isoladas" de "não confundir Chade com Romênia" — e a cauda da coleção é, quase por definição, o conjunto confundível.

## P0 — sem isto, "funcionar muito bem" é uma afirmação falsa

Os itens estão em ordem de dependência. O ganho pedagógico maior está no segundo e no terceiro; o primeiro existe porque eles precisam dele.

### 1. Currículo editorial: ordem de introdução e conjuntos de confusão

Hoje a ordem em que bandeiras novas entram é a ordem alfabética do catálogo. Isso não é uma decisão pedagógica neutra: é o acaso do alfabeto ocupando o lugar de uma decisão, e ele espalha Chade e Romênia por meses de distância enquanto empilha Afeganistão, África do Sul e Albânia na primeira leva. A região está nos dados e não é usada.

Ordem e conjuntos de confusão são o mesmo artefato porque são o mesmo fato: a ordem determina quais bandeiras ficam adjacentes na memória, e a adjacência determina o que precisa ser contrastado. Separá-los em dois arquivos criaria duas verdades sobre a mesma coisa.

Entra `src/data/curriculum.json` — o único arquivo de `src/data/` escrito à mão. O esquema e os critérios editoriais estão em [`CONTENT-FLAGS.md`, seção 9](CONTENT-FLAGS.md).

**Terminado quando:** a ordem é uma permutação exata dos identificadores do catálogo, e `pnpm data:validate` falha se não for; todo grupo de confusão tem ao menos dois membros, uma razão escrita e um traço distintivo por par; o validador **lista os pares que a heurística considera confundíveis e não pertencem a nenhum grupo nem à lista versionada de exceções justificadas**, para que cobertura parcial seja visível em vez de silenciosa; a fila diária consome a ordem do currículo em vez da ordem do catálogo, com teste fixando quais são os primeiros itens de um perfil zerado.

### 2. Feedback de erro que fala da bandeira

Ao errar, o aplicativo explica o agendador. É o instante de maior disponibilidade cognitiva da sessão inteira, e ele é gasto com meta-informação sobre revisão espaçada. Enquanto isso, a informação mais valiosa da interação — **qual bandeira a pessoa escolheu no lugar da certa** — já está na mão do componente e é descartada.

Nenhum outro item deste backlog devolve tanto aprendizado por linha de código.

**Terminado quando:** ao errar uma alternativa, o painel nomeia a entidade escolhida, a correta e o traço que as distingue, lido do currículo; um teste fixa que escolher a Romênia quando a resposta é o Chade mostra o traço curado daquele par; um par sem curadoria cai num texto que ainda nomeia as duas entidades e suas regiões — genérico é piso aceitável, vazio não é; e a frase sobre agendamento não aparece em nenhum veredito de erro.

### 3. Exercício de contraste

Decidido em [ADR-0006](adr/0006-contraste-como-exercicio-de-primeira-classe.md), que reverte a posição registrada em `src/types/learning.ts`. O argumento inteiro está lá e na tabela _exercício → evidência_ de [`HARNESS-VISUAL.md`](HARNESS-VISUAL.md): acertar entre quatro opções é evidência de recuperação; distinguir um par é evidência de discriminação; são coisas diferentes e a segunda não existe hoje.

**Terminado quando:** existe o tipo de exercício `contrastChoice`; a fila insere um contraste quando um grupo tem ao menos dois membros já vistos **e** houve erro cruzado entre membros do grupo na janela recente; um teste determinístico sob semente mostra que, dado um histórico com erro do Chade pela Romênia, a fila do dia contém o contraste correspondente; o acerto grava a discriminação daquele grupo no estado da habilidade, que é o registro que o item 4 vai ler; e o passo é completável só pelo teclado.

### 4. Critério de domínio que exige discriminação

A tela de progresso promete evidência, não sequência. Enquanto "dominada" não exigir ter vencido uma confundível, a promessa é falsa: uma bandeira pode ser dada como sabida por alguém que a troca sistematicamente pela vizinha.

Barato depois do item 3, e pré-requisito de qualquer sistema de conquistas — uma conquista construída sobre um critério frouxo é pior do que nenhuma conquista.

**Terminado quando:** o domínio ganha a razão "falta discriminação", exigida apenas de entidades que pertençam a algum grupo de confusão; entidades fora de qualquer grupo não são penalizadas, com teste que fixa isso; um teste de regressão mostra que um estado que hoje devolve "dominada" para o Chade passa a devolver "falta discriminação" até haver o registro; e a tela exibe a razão que o domínio devolve, sem reescrever o limiar em prosa.

### 5. Diagnóstico amostral e não bloqueante

Decidido em [ADR-0007](adr/0007-diagnostico-amostral.md). Duzentas e vinte respostas digitadas antes do primeiro exercício útil é o maior risco isolado de abandono do produto, e é pedagogicamente errado pelos próprios termos da spec. Enquanto ele for o portão, tudo que os itens 1 a 4 entregam fica atrás de meia hora de digitação.

Tem um efeito colateral que importa para o item 6: é por causa desse portão que a suíte de ponta a ponta nunca chegou a exercitar uma sessão de estudo.

**Terminado quando:** a amostra é estratificada por região, com algumas dezenas de itens e nunca 220, aprofundando apenas onde a incerteza justificar; um teste sob semente garante que nenhuma região fica de fora e que há um mínimo de itens por região; entidades não amostradas entram como não vistas, jamais como conhecidas; `/estudar` funciona sem diagnóstico algum, com teste de que a fila devolve itens novos nessa situação; e um teste de ponta a ponta abre `/estudar` num perfil zerado e responde três itens sem passar pelo diagnóstico.

### 6. Rede de proteção nas telas que ensinam

`StudySession` e `DiagnosticSession` são os dois únicos componentes do repositório sem nenhum teste — e são exatamente onde os cinco itens acima vão aterrissar. Entregar ganho pedagógico sobre código não coberto é converter um aplicativo que funciona num aplicativo frágil que funcionava.

Este item não vem depois dos outros: vem **com** cada um deles.

**Terminado quando:** as duas sessões têm testes de componente cobrindo os vereditos correto, parcial e incorreto, a reinserção da correção imediata, a identidade das marcas de progresso, o passo de contraste e o feedback específico; `pnpm test:e2e` roda no CI contra o build de produção, antes do deploy; e a cobertura passa a incluir `src/components/**`, com piso medido e não descendente.

## P1 — completa a experiência

**Introdução rica de bandeira nova.** Região, traço distintivo e contraste imediato com a vizinha, seguidos de recuperação ativa. Depende do item 1. A codificação inicial é onde o custo de todas as revisões futuras se decide, e hoje ela se resume a "observe a composição".

**Resumo de sessão.** O que foi aprendido, o que foi confundido, quando é a próxima revisão. Fecha o ciclo e ensina, de passagem, o que o agendador está fazendo.

**Progresso por entidade e habilidade.** Quatro números agregados não respondem "o que eu confundo?" nem "o que falta no Brasil?". O dado já existe no domínio; falta a tela.

**Distratores informados pelo histórico de erro.** Refinamento sobre o item 1, não substituto: os grupos curados entregam a maior parte do ganho, e isto afina o resto.

**Conquistas.** Não melhoram retenção diretamente; melhoram taxa de retorno, e sem retorno não há repetição espaçada. Vêm depois do item 4 pela razão já dita.

## P2

**Preferências na tela de ajustes.** Expor a retenção desejada a quem não sabe o que é FSRS é um pé de ouvido, não uma funcionalidade. Quando isto entrar, a preferência que importa é o ritmo — quantas bandeiras novas por dia —, não o parâmetro do algoritmo.

## O que não está aqui, e por quê

Trilhas por continente como escolha do usuário: a ordem editorial do item 1 já entrega o ganho pedagógico da progressão regional; deixar a pessoa escolher a região é interface, e vem depois de a progressão existir.

Avaliação de consolidação da coleção inteira: prevista na spec, ainda não desenhada. Desenhar antes de o critério de domínio do item 4 existir seria construir a prova antes de saber o que ela deve provar.

Qualquer segundo domínio de conhecimento — capitais, elementos, instrumentos. O roadmap está na [spec, §10](SPEC.md), e a decisão de não começá-lo agora está na §28.

Reorganizar `src/` em engine, harnesses e coleções: desejável, registrado como issue, e sem valor pedagógico imediato. A fronteira que importa hoje é a que já existe e é verificada — domínio puro, catálogo `server-only` — não a que se veria no caminho dos arquivos.
