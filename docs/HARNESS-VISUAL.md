# Harness de reconhecimento visual canônico

Um harness pedagógico é o conjunto de regras que ensina um **tipo de habilidade**, não um assunto. Este aqui serve a domínios em que cada entidade tem uma representação visual canônica — bandeiras hoje, e depois brasões, símbolos ou mapas estilizados. O que ele não serve, e é bom dizer desde já, é a domínios em que a entidade tem muitas aparências legítimas: uma ave fotografada de três ângulos exige separar mídia de treino de mídia de avaliação, e isso é outro harness.

Este documento é dono do desenho: que atividades existem, que evidência cada uma produz, como se corrige, como se decide que alguém sabe. Os **valores** das constantes citadas moram no código, em `src/domain/`, e são nomeados aqui sem serem transcritos, para que não haja duas verdades.

Uma convenção de leitura: o que já está implementado aparece no presente; o que está decidido mas não construído aparece marcado como **previsto**, com o ADR que o decidiu.

## 1. A habilidade, e por que são duas

Reconhecer uma bandeira e produzir seu nome são coisas diferentes, e saber uma não implica saber a outra — a assimetria é conhecida e qualquer pessoa que já tenha estudado um idioma a sentiu. Por isso o estado de aprendizagem não é por entidade, mas por **entidade × habilidade**, com duas habilidades independentes:

- `flagToNameRecall` — ver a bandeira e produzir o nome;
- `nameToFlagRecognition` — ver o nome e reconhecer a bandeira entre outras.

Cada uma tem seu próprio cartão de agendamento, seu próprio histórico e seu próprio vencimento. A chave é `entityId::skill`, construída por `skillStateId`.

## 2. Atividades, e a evidência de cada uma

Esta tabela é o teste operacional de não-redundância do projeto: **uma proposta de exercício novo preenche uma linha nova aqui, ou é recusada**. Dois exercícios que produzem a mesma evidência são dois jeitos de fazer a mesma coisa; dois que produzem evidências diferentes não são redundância, são cobertura.

| Exercício                                 | O que se pergunta                                  | Evidência produzida                           | Agenda? |
| ----------------------------------------- | -------------------------------------------------- | --------------------------------------------- | ------- |
| `diagnostic`                              | digite o nome desta bandeira, ou pule              | conhecimento prévio na direção de recuperação | sim     |
| `flagToNameChoice`                        | de onde é esta bandeira? (`CHOICE_COUNT` nomes)    | reconhecimento **apoiado** por alternativas   | não     |
| `flagToNameInput`                         | digite o nome desta bandeira                       | recuperação **sem apoio**                     | sim     |
| `nameToFlagChoice`                        | qual é a bandeira de X? (`CHOICE_COUNT` bandeiras) | reconhecimento na direção inversa             | sim     |
| `contrastChoice` **(previsto, ADR-0006)** | qual destas duas é X?                              | **discriminação daquele par**                 | sim     |

A linha que mais explica o desenho é a terceira coluna de `flagToNameChoice`: ela não agenda e sempre encadeia para `flagToNameInput`. A alternativa múltipla aqui é **andaime, não avaliação** — serve para que a primeira tentativa depois de conhecer a bandeira não seja uma folha em branco, e a medida vem logo em seguida, sem apoio. Registrar uma revisão bem-sucedida com base numa escolha entre quatro opções inflaria o agendamento com uma evidência mais fraca do que ele supõe estar recebendo.

A distinção entre a quarta e a quinta linha é o argumento inteiro do ADR-0006. Acertar `nameToFlagChoice` tendo a Romênia entre as quatro opções significa que a Romênia não foi escolhida — não que a pessoa saiba distinguir o Chade da Romênia. A primeira é evidência de recuperação; a segunda, de discriminação. É a segunda que o critério de domínio precisa consumir, e ela não existe hoje.

## 3. Introdução de uma bandeira nova

O passo de ensino mostra a bandeira em tamanho grande, o nome, e a nota editorial quando existe — é o único momento em que a nota aparece, porque em qualquer outro ela entregaria a resposta. Em seguida vem imediatamente a recuperação ativa: ninguém "estuda" a tela; olha e tenta.

Uma bandeira volta ao passo de ensino quando é nova, quando não há estado, ou quando a última tentativa foi errada ou pulada. Nos demais casos a sessão começa direto pela recuperação.

**Previsto:** a introdução deveria também situar a região, apontar o traço visualmente distintivo e contrastar com a vizinha confundível quando houver uma. Os três dados existem — região está no catálogo, paleta está no catálogo, confundibilidade é calculável — e nenhum é usado. A codificação inicial é onde o custo de todas as revisões futuras se decide, e hoje ela é rasa.

## 4. Escolha dos distratores

Distrator sorteado ao acaso ensina a eliminar, não a reconhecer: se as outras três opções forem de continentes diferentes e cores diferentes, a pessoa acerta sem olhar a bandeira. A política é, portanto, enviesada de propósito.

A confundibilidade entre duas bandeiras combina semelhança de paleta e igualdade de região, com a cor pesando mais — é o que o olho compara primeiro. Os candidatos são ordenados por essa medida, cortados numa vizinhança de tamanho `NEIGHBOURHOOD_SIZE`, e sorteados com peso proporcional à confundibilidade somada a um `BASE_WEIGHT`. Cada uma dessas três decisões evita um defeito concreto: sem o corte, o viés se dilui entre 219 candidatos e as alternativas voltam a ser aleatórias; sem o peso base, as opções colapsam sempre nas mesmas duas ou três bandeiras e o exercício vira decorável por semelhança; sem o desempate por identificador, a vizinhança passa a depender da ordem em que o catálogo foi carregado.

O conjunto devolvido já vem com o alvo dentro e embaralhado. Devolver os distratores para o chamador juntar ao alvo tornaria expressáveis dois erros que de fato aconteceram: esquecer de embaralhar, e deixar a resposta certa sempre na mesma posição.

**Limite conhecido.** A paleta é quantizada em nomes de cor e descarta tom, ordem, orientação e proporção. Chade e Romênia têm paletas idênticas; Polônia, Indonésia e Mônaco também; Irlanda e Costa do Marfim diferem apenas na ordem das faixas. A medida encontra o par certo por acidente nos dois primeiros casos e não tem como explicá-lo em nenhum: ela é um bom **amostrador de distratores** e um péssimo **detector de confusão**. É por isso que os pares que importam precisam ser curados, e não inferidos — ver `CONTENT-FLAGS.md`, seção 9.

**Previsto:** a política ignora o histórico da pessoa. Uma bandeira que ela já trocou por outra deveria aparecer como distrator com mais frequência do que uma que ela nunca confundiu.

## 5. Correção da resposta

Alternativas se corrigem por identidade. Resposta digitada passa pelo resolvedor de nomes, que normaliza acentuação, caixa e pontuação, indexa nome e aliases, e classifica em exata, parcial ou errada.

Duas regras impedem que a tolerância a erro de digitação vire tolerância a erro de conhecimento: um typo só é aceito quando o alvo é o **único** vizinho próximo, e o nome exato de outra entidade **nunca** é tratado como typo. Digitar "Áustria" quando a resposta é "Austrália" é erro, não escorregão de teclado — e é exatamente o tipo de par que o produto existe para desfazer.

A avaliação resultante alimenta o agendador em quatro graus — correta, parcial, incorreta, pulada — que viram as classificações correspondentes do FSRS. Pular é tratado como erro, e não como ausência de dado, porque quem pula não sabe.

## 6. Feedback do erro

O erro é o instante de maior disponibilidade cognitiva de toda a sessão: a pessoa acabou de descobrir que não sabia, está olhando a tela e quer saber por quê.

Hoje esse instante é gasto explicando o agendador — a tela informa que o item reaparecerá mais tarde e que a correção imediata não contará como retenção. É informação verdadeira e é a informação errada. Pior: o aplicativo **sabe qual foi a resposta errada** e descarta esse dado, que vai para o histórico e nunca vira explicação.

**Previsto (P0 do backlog).** Ao errar, o painel deve nomear o que foi escolhido, o que era certo, e o traço que distingue os dois, lido do currículo editorial — "esta é a do Chade; a que você escolheu é a da Romênia, cujo azul é mais claro". Quando o par não estiver curado, o texto ainda deve nomear as duas entidades e suas regiões: genérico é aceitável como piso, vazio não é. E a frase sobre agendamento sai do veredito de erro.

## 7. Sessão

Uma sessão tem tamanho previsível e pode ser encerrada a qualquer momento sem punição. A fila combina, nesta ordem: revisões vencidas, itens em correção — aqueles cuja última tentativa não foi correta — e itens novos.

O volume de novidades é adaptativo, e a regra é conservadora de propósito: se há muita revisão vencida ou a acurácia recente caiu, entram menos itens novos, ou nenhum. Aprender coisa nova enquanto o que já se aprendeu está desmoronando é o modo mais confiável de não aprender nada.

Um item errado volta poucas posições à frente, dentro da mesma sessão, marcado como correção imediata. Essa segunda passagem não conta como dia distinto de sucesso nem como acerto de primeira: ela existe para fechar o ciclo enquanto a informação está fresca, não para inflar a métrica.

**Previsto:** a sessão termina sem dizer o que foi aprendido, o que foi confundido e quando é a próxima revisão.

## 8. Diagnóstico

O diagnóstico percorre hoje **todas as 220 entidades**, numa direção só, com resposta digitada ou pulo, e é **obrigatório** antes de qualquer sessão de estudo.

Isso é errado em três frentes, e a spec já dizia por quê. É caro: meia hora de digitação antes do primeiro exercício útil. É incompleto: mede recuperação e não mede reconhecimento, de modo que a segunda habilidade nasce sem estimativa nenhuma. E é bloqueante: enquanto ele for o portão, toda melhoria feita nas sessões fica atrás dele.

**Previsto (ADR-0007).** Amostra estratificada por região, com um punhado de dezenas de itens em vez de 220, aprofundando apenas onde a incerteza justificar. Entidades não amostradas entram como não vistas, nunca como conhecidas — um diagnóstico pode poupar trabalho, jamais inventar domínio. E `/estudar` deixa de depender dele: quem quiser começar a estudar começa.

## 9. Generalização

Não se aplica a este harness, e é importante dizer em vez de deixar a lacuna implícita. Cada bandeira tem uma representação canônica única; não há como alguém "acertar a foto e errar o pássaro". A separação entre mídia de treino e mídia de avaliação, que a spec exige de domínios com múltiplos exemplares, é requisito do harness de reconhecimento generalizável — não deste.

O que existe de análogo aqui é a variação de **direção** (as duas habilidades) e a variação de **contexto** (a bandeira ao lado de suas confundíveis), que é o que a seção seguinte cobra.

## 10. Critério de domínio

Uma bandeira está dominada quando as duas habilidades existem, cada uma com recuperações bem-sucedidas em pelo menos dois dias distintos de calendário, com estabilidade estimada de ao menos `MASTERY_STABILITY_DAYS` e a última tentativa correta. Quando não está, o domínio devolve **a razão** — falta habilidade, faltam dias distintos, falta estabilidade, o último resultado não foi correto — e é essa razão que a interface exibe. A interface não recalcula o critério nem o transcreve em prosa: já fez isso uma vez e divergiu.

Os dias distintos são contados no fuso da pessoa, resolvido uma vez e persistido, para que viajar não reclassifique o histórico. Correções imediatas não contam como dia de sucesso.

**Previsto (ADR-0006):** uma razão a mais — falta discriminação —, exigida apenas de entidades que pertençam a algum conjunto de confusão curado. Sem isso, "dominada" pode significar "acerta sozinha, erra ao lado da parecida", e a promessa que a tela de progresso faz é falsa.

Falta também a avaliação de consolidação da coleção inteira, prevista na spec e ainda não desenhada.

## 11. Sinais de que o harness está falhando

Vale a pena nomear o que denunciaria que este desenho não funciona, porque é o tipo de coisa que não se percebe olhando métricas de uso.

A pessoa acerta na sessão e erra semanas depois — retenção que não sustenta. A pessoa acerta as alternativas e falha na resposta digitada de forma persistente — reconhecimento sendo confundido com conhecimento. A pessoa domina bandeiras isoladas e continua trocando os pares clássicos — discriminação não aprendida. A acurácia sobe enquanto o número de confusões distintas não cai — o aplicativo está ensinando a eliminar opções, não a reconhecer bandeiras.

Nenhum desses sinais é observável hoje: o histórico registra a resposta errada, mas nada agrega confusões por par. Instrumentar isso é pré-requisito para afirmar que o harness funciona — e não apenas que as pessoas clicam nele.
