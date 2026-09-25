# SPEC — Plataforma de conquistas pessoais de conhecimento

**Status:** vigente; decisões derivadas em [`adr/`](adr/)
**Versão:** 1.0
**Data:** 26 de julho de 2026
**Nome do projeto:** brunanki

Este documento é dono da tese, dos não objetivos, dos princípios pedagógicos, do vocabulário e do roadmap de domínios. O que ele decidiu e o código materializou vive nos ADRs; o desenho do primeiro harness, em [`HARNESS-VISUAL.md`](HARNESS-VISUAL.md); a política editorial da coleção de bandeiras, em [`CONTENT-FLAGS.md`](CONTENT-FLAGS.md); o plano de trabalho, em [`MVP-BACKLOG.md`](MVP-BACKLOG.md). Onde uma seção daqui foi substituída por um desses documentos, ela aponta para ele em vez de repeti-lo.

---

## 1. Resumo executivo

Este projeto é uma plataforma gratuita para ajudar pessoas a **conquistar domínios delimitados de conhecimento** — por exemplo, reconhecer todas as bandeiras nacionais, saber as capitais do mundo, identificar instrumentos musicais pelo som, aprender os elementos químicos, reconhecer animais brasileiros ou memorizar muitos dígitos de π usando técnicas mnemônicas adequadas.

A plataforma será inspirada em princípios do Math Academy, do Anki e da ciência da aprendizagem, mas não será um repositório genérico de flashcards. Cada domínio deverá ser ensinado por uma experiência deliberadamente desenhada para a natureza daquele conhecimento.

A unidade central do produto não será o “deck”, o “curso” nem o “quiz”. Será a **conquista de conhecimento**:

> Escolha algo que você sempre quis saber. A plataforma ajuda você a realmente aprender, reter e demonstrar esse domínio.

O primeiro recorte será um aplicativo para aprender bandeiras. A arquitetura, entretanto, deverá suportar posteriormente associações factuais, localização espacial, sequências, reconhecimento auditivo, reconhecimento visual com múltiplos exemplares, conhecimentos em camadas e habilidades especializadas como código Morse e memorização mnemônica de π.

---

## 2. Tese do produto

Há muitos conhecimentos que:

- são divertidos de possuir, mesmo quando não são imediatamente utilitários;
- têm um escopo relativamente delimitado;
- proporcionam uma sensação clara de domínio e completude;
- podem ser aprendidos melhor com recuperação ativa, espaçamento, intercalação e prática adaptativa;
- são mal atendidos por cursos tradicionais e por flashcards genéricos;
- permitem uma conquista pessoal fácil de compreender e compartilhar.

Exemplos:

- “Reconheço todas as bandeiras nacionais.”
- “Sei todas as capitais do mundo.”
- “Identifico os instrumentos da orquestra pelo som.”
- “Sei todos os presidentes do Brasil em ordem.”
- “Reconheço cem aves brasileiras.”
- “Memorizei cem dígitos de π usando um sistema mnemônico.”

O produto deve tornar esse tipo de objetivo **agradável, estruturado, confiável e alcançável**.

---

## 3. Visão

Construir uma espécie de **academia de conhecimentos colecionáveis**, na qual a pessoa possa escolher domínios que gostaria de conquistar e receber uma trilha de aprendizagem adaptativa, curada e apropriada para cada um deles.

A plataforma deve transmitir:

- curiosidade;
- descoberta;
- domínio progressivo;
- orgulho pessoal;
- profundidade opcional;
- ludicidade sem infantilização;
- rigor sem aparência escolar excessiva.

A experiência ideal deve servir tanto para uma pessoa de 10 ou 11 anos muito curiosa quanto para um adulto que sempre quis aprender bandeiras, constelações, instrumentos ou técnicas de memória.

---

## 4. Objetivos

### 4.1. Objetivos principais

1. Ensinar conhecimentos delimitados por meio de recuperação ativa e repetição espaçada.
2. Adaptar a experiência ao tipo de habilidade, em vez de tratar tudo como flashcard.
3. Permitir domínio progressivo: primeiro reconhecer uma entidade, depois aprender novas propriedades e relações.
4. Medir conhecimento real, retenção e generalização, e não apenas exposição ou quantidade de questões respondidas.
5. Criar uma sensação de conquista pessoal clara e não comparativa.
6. Manter o catálogo curado, versionado e baseado em fontes e mídias devidamente atribuídas.
7. Ser gratuito e acessível, evitando mecânicas predatórias de engajamento.
8. Construir uma arquitetura que permita adicionar novos harnesses pedagógicos sem reescrever a engine central.

### 4.2. Não objetivos iniciais

O produto **não** será, inicialmente:

- uma plataforma genérica para criar decks;
- um marketplace de conteúdo;
- um sistema em que usuários criam desafios públicos;
- uma rede social completa;
- uma plataforma competitiva com ranking global;
- uma preparação para provas escolares;
- um LMS para professores;
- um aplicativo infantil com linguagem, mascotes ou recompensas exclusivamente infantis;
- uma coleção enorme de quizzes de baixa qualidade;
- um clone visual do Anki;
- uma ferramenta que ensina técnicas inadequadas apenas porque são mais fáceis de implementar.

---

## 5. Princípios de produto e pedagogia

### 5.1. Harness específico antes de volume de conteúdo

A plataforma deverá privilegiar poucos módulos bem ensinados em vez de dezenas de coleções superficiais.

Cada novo domínio precisa responder:

1. Qual é a conquista clara?
2. O que significa realmente saber isso?
3. Qual estratégia de aprendizagem é adequada?
4. Quais erros e confusões típicas precisam ser diagnosticados?
5. Como verificar retenção e generalização?

Um módulo só deve ser publicado quando houver respostas satisfatórias.

### 5.2. Domínio, não exposição

“Viu este conteúdo” não significa “aprendeu este conteúdo”.

A plataforma deve distinguir pelo menos:

- apresentado;
- reconhecido;
- recuperado sem ajuda;
- consolidado em ocasiões espaçadas;
- generalizado para novos exemplos;
- dominado;
- enferrujado e precisando de revisão.

### 5.3. Recuperação ativa como padrão

A pessoa deve tentar recordar ou identificar a resposta antes de receber a solução. Releitura passiva e exposição repetida serão usadas apenas quando pedagogicamente necessárias.

### 5.4. Repetição espaçada no nível da habilidade

O agendamento deve ocorrer por habilidade específica, e não apenas por entidade.

Exemplo:

- reconhecer a bandeira do Japão;
- recordar a capital do Japão;
- localizar o Japão no mapa;
- identificar o formato territorial do Japão;

são habilidades relacionadas, mas separadas.

### 5.5. Profundidade progressiva

Uma entidade pode ser aprendida em camadas.

Exemplo:

```text
Hidrogênio
✓ símbolo → nome
✓ nome → símbolo
✓ número atômico
○ posição na tabela
○ família
○ propriedades
○ usos
```

A plataforma deve permitir começar por uma conquista simples e aprofundar o mesmo domínio depois.

### 5.6. Curadoria como parte do produto

Conteúdo, mídia, progressão, distratores, pares confundíveis e critérios de domínio serão curados. Ingestão automatizada poderá encontrar candidatos, mas não deve publicar conteúdo automaticamente sem validação.

### 5.7. Ludicidade sem coerção

A plataforma pode usar:

- coleções;
- mapas;
- álbuns;
- conquistas;
- progressão visual;
- descoberta;
- títulos de domínio;
- celebrações discretas.

Deve evitar:

- rankings globais;
- punições por perder sequência diária;
- contadores destinados apenas a aumentar tempo de uso;
- recompensas aleatórias manipulativas;
- vergonha por esquecimento;
- notificações agressivas.

### 5.8. Não ensinar uma estratégia ruim por conveniência técnica

Dois exemplos normativos:

- **π não será ensinado por memorização bruta de dígitos.** O módulo só será lançado quando puder ensinar e treinar um sistema mnemônico adequado.
- **Código Morse não será ensinado primariamente como uma tabela visual de pontos e traços.** O harness deverá privilegiar reconhecimento auditivo direto e progressivo.

### 5.9. Social sem comparação

O aspecto social, quando implementado, deve priorizar expressão e reconhecimento:

- perfil de conquistas;
- compartilhamento de um certificado ou marco;
- atividade opcional de amigos;
- estudar a mesma coleção em paralelo;
- recomendar uma coleção oficial.

Não haverá ranking global no escopo inicial.

### 5.10. Público amplo, estética não infantil

O produto deve ser compreensível para jovens, mas não parecer feito apenas para crianças. A linguagem deve ser simples, respeitosa e curiosa. A estética pode ser lúdica, colorida e colecionável, sem caricaturar o usuário.

---

## 6. Vocabulário do sistema

### 6.1. Engine

Infraestrutura compartilhada entre todos os módulos:

- contas e sincronização;
- histórico de respostas;
- agendamento de revisões;
- estimativa de domínio;
- sessões;
- diagnósticos;
- conquistas;
- acessibilidade;
- telemetria de aprendizagem;
- gerenciamento de conteúdo versionado.

### 6.2. Harness pedagógico

Conjunto de regras, interfaces e exercícios que ensinam um determinado **tipo de habilidade**.

Exemplos:

- reconhecimento visual;
- associação factual;
- localização espacial;
- sequência e linha do tempo;
- discriminação auditiva;
- reconhecimento visual generalizável;
- classificação hierárquica;
- sistema mnemônico.

### 6.3. Coleção

Um objetivo editorialmente delimitado.

Exemplos:

- Bandeiras nacionais do mundo;
- Capitais da América do Sul;
- Instrumentos da orquestra;
- Cem aves brasileiras essenciais;
- Presidentes do Brasil;
- Primeiros cem dígitos de π.

### 6.4. Entidade

Objeto do mundo sobre o qual existem fatos e habilidades.

Exemplos: Brasil, hidrogênio, oboé, tucano-toco, Getúlio Vargas.

### 6.5. Habilidade

Capacidade específica e avaliável.

Exemplos:

- `flag_to_country` para Brasil;
- `country_to_capital` para Brasil;
- `audio_to_instrument` para oboé;
- `portrait_to_president` para Getúlio Vargas;
- `locate_on_map` para Bolívia.

### 6.6. Exemplar

Uma instância de mídia que representa uma entidade.

Uma bandeira pode ter um SVG canônico. Uma ave precisa de várias fotografias. Um instrumento deve ter vários áudios, executantes, notas e registros.

### 6.7. Conjunto de confusão

Grupo de itens que costumam ser confundidos e devem ser praticados em contraste.

Exemplos:

- Romênia, Chade, Andorra e Moldávia;
- oboé e clarinete;
- sabiá-laranjeira e espécies visualmente próximas;
- presidentes com nomes ou períodos adjacentes.

### 6.8. Currículo

Regras que determinam a ordem de introdução de habilidades, pré-requisitos, agrupamentos e critérios de liberação.

### 6.9. Domínio

Estimativa baseada em múltiplas recuperações corretas, espaçadas e, quando pertinente, realizadas com novos exemplares ou em novo contexto.

### 6.10. Conquista

Marco verificável de conhecimento, não apenas de atividade.

Exemplo: “Reconheceu todas as bandeiras nacionais e manteve domínio após revisão espaçada”.

---

## 7. Modelo conceitual de aprendizagem

### 7.1. Estado por habilidade

O estado mínimo de aprendizagem deverá ser armazenado por combinação de:

```text
usuário + coleção + entidade + habilidade
```

Exemplo:

```text
user_123 + flags_world + brazil + flag_to_country
```

O sistema não deve armazenar apenas “Brasil aprendido”.

### 7.2. Estados de domínio

Estados de interface sugeridos:

1. **Não iniciado** — habilidade ainda não apresentada.
2. **Em aprendizagem** — apresentada, mas ainda instável.
3. **Reconhecida** — acerto inicial, ainda sem evidência de retenção.
4. **Consolidando** — múltiplos acertos e intervalos crescentes.
5. **Dominada** — atingiu os critérios do módulo.
6. **Precisa de revisão** — probabilidade de retenção caiu ou houve erro recente.

Internamente, o sistema deverá armazenar valores contínuos, datas e histórico; os rótulos são uma simplificação visual.

### 7.3. Componentes do estado

Cada estado de habilidade deve poder registrar:

- data da primeira apresentação;
- última revisão;
- próxima revisão;
- estabilidade estimada;
- dificuldade estimada;
- probabilidade de recuperação;
- número de tentativas;
- sequência de resultados recentes;
- tempo de resposta;
- uso de dica;
- tipos de erro;
- exemplares já vistos;
- confusões recorrentes;
- status de domínio.

O algoritmo de espaçamento deve ser encapsulado atrás de uma interface substituível. A primeira implementação pode usar um algoritmo inspirado em FSRS, sem acoplar o modelo de dados a uma biblioteca específica.

### 7.4. Avaliação da resposta

Cada harness converte uma interação em uma avaliação comum, por exemplo:

```text
0 = incorreta ou revelada
1 = correta com ajuda / muito hesitante
2 = correta
3 = correta, fluente e sem ajuda
```

A avaliação poderá combinar:

- correção;
- quantidade de tentativas;
- uso de pista;
- latência;
- proximidade do erro;
- tipo de atividade;
- novidade do exemplar.

O sistema não deve penalizar excessivamente tempo de resposta em usuários com necessidades de acessibilidade.

### 7.5. Diagnóstico inicial

Cada coleção deve oferecer um diagnóstico opcional ou recomendado que:

- amostre diferentes subgrupos do conteúdo;
- use poucas questões por item no início;
- aumente ou reduza a cobertura adaptativamente;
- diferencie reconhecimento de recuperação;
- evite classificar como dominado com base em um único acerto;
- permita pular conteúdo claramente conhecido, mas programe verificações futuras.

O diagnóstico de bandeiras, por exemplo, pode começar com uma amostra estratificada por continente e dificuldade e aprofundar apenas onde houver incerteza.

### 7.6. Composição de uma sessão

Uma sessão padrão deve combinar:

1. revisões vencidas;
2. pequena quantidade de conteúdo novo;
3. prática de pares confundidos;
4. atividades de integração ou generalização;
5. encerramento com resumo útil.

A proporção exata deve ser configurável por harness. A sessão deve ter duração ou quantidade de itens previsível e permitir encerramento sem punição.

### 7.7. Critério geral de domínio

Uma habilidade não deve ser marcada como dominada por um único acerto. O critério deve exigir, conforme o domínio:

- acertos em ocasiões separadas;
- intervalos mínimos crescentes;
- recuperação sem pista;
- uso de direções diferentes quando aplicável;
- discriminação contra itens confundíveis;
- generalização para exemplar não visto;
- aprovação em avaliação de consolidação.

Cada coleção definirá seus critérios concretos.

---

## 8. Contrato de um harness pedagógico

Todo harness deve implementar conceitualmente os seguintes componentes:

### 8.1. Definição de habilidade

- O que a pessoa deverá conseguir fazer?
- Qual é a unidade mínima de domínio?
- Há direções independentes?

### 8.2. Estratégia de introdução

- Como apresentar o item pela primeira vez?
- É necessário explicar pistas diagnósticas?
- Deve haver contraste imediato com itens similares?

### 8.3. Gerador de atividades

- Quais tipos de questão podem ser criados?
- Como escolher distratores?
- Como controlar dificuldade?
- Como variar exemplares?

### 8.4. Avaliador de resposta

- Como normalizar texto?
- Como avaliar cliques, ordem, áudio ou digitação contínua?
- Quais erros são pedagogicamente diferentes?

### 8.5. Diagnóstico

- Como estimar conhecimento prévio com poucas perguntas?

### 8.6. Generalização

- Como verificar que a pessoa aprendeu a entidade e não uma mídia específica?

### 8.7. Conjuntos de confusão

- Quais itens precisam ser contrastados?
- Como atualizar confusões com base nos erros individuais?

### 8.8. Critério de domínio

- Quantos acertos?
- Com quais intervalos?
- Em quais tipos de atividade?
- Com quais exemplares?

### 8.9. Métricas de aprendizagem

- O que indica melhora real?
- Quais sinais mostram falha do próprio harness?

### 8.10. Componentes de interface

- Quais componentes específicos o harness exige?

---

## 9. Harnesses planejados

### 9.1. Reconhecimento visual canônico

**Aplicações:** bandeiras, símbolos químicos apresentados graficamente, brasões, mapas estilizados.

Características:

- uma representação canônica ou quase canônica por entidade;
- múltipla escolha e resposta digitada;
- prática de confusões;
- possibilidade de perguntas em ambas as direções;
- recortes ou variações cuidadosamente usadas para evitar pistas irrelevantes.

### 9.2. Associação factual bidirecional

**Aplicações:** país–capital, elemento–símbolo, obra–artista, presidente–período.

Características:

- direções avaliadas separadamente;
- normalização robusta de texto;
- respostas alternativas;
- distratores plausíveis;
- intercalação entre entidades próximas;
- aprofundamento por atributos adicionais.

### 9.3. Localização espacial

**Aplicações:** países, estados, anatomia, tabela periódica, constelações.

Características:

- clicar em região;
- identificar uma região destacada;
- reconstruir posição;
- usar vizinhança e contexto;
- alternar mapas completos e recortes;
- medir precisão espacial quando fizer sentido.

### 9.4. Sequência e linha do tempo

**Aplicações:** presidentes, dinastias, eras geológicas, campeões de Copas, etapas históricas.

Características:

- predecessor e sucessor;
- ordenação de subconjuntos;
- preenchimento de lacunas;
- retomada a partir de pontos intermediários;
- segmentação da sequência;
- associação com períodos e eventos.

### 9.5. Discriminação auditiva

**Aplicações:** instrumentos, cantos de aves, intervalos musicais, idiomas.

Características:

- múltiplos exemplares por entidade;
- normalização de volume e duração;
- controle de pistas acidentais;
- pares perceptivamente confundíveis;
- dificuldade progressiva;
- teste com áudio não ouvido anteriormente.

### 9.6. Reconhecimento visual generalizável

**Aplicações:** animais, aves, plantas, arquitetura, arte.

Características:

- diversos exemplares por entidade;
- separação entre mídia de treino e mídia de avaliação;
- variação de ângulo, sexo, idade, iluminação e contexto quando relevante;
- destaque de características diagnósticas;
- prática contrastiva entre espécies ou estilos próximos.

### 9.7. Conhecimento hierárquico

**Aplicações:** taxonomia biológica, famílias de instrumentos, famílias linguísticas, períodos históricos.

Características:

- classificar entidade;
- navegar pela árvore;
- comparar irmãos;
- reconstruir hierarquia;
- aprender progressivamente níveis mais profundos.

### 9.8. Código Morse — harness especializado

Morse será tratado como habilidade auditiva e temporal, não como mera associação visual.

Requisitos preliminares:

- introdução de poucos caracteres por vez;
- caracteres tocados em ritmo natural;
- espaçamento ajustável entre caracteres e grupos;
- identificação auditiva sem tradução consciente de “ponto” e “traço”;
- adição adaptativa de novos caracteres;
- prática com grupos e palavras;
- produção opcional em etapa posterior;
- aumento gradual de velocidade;
- registro dos pares auditivamente confundidos.

A representação visual poderá aparecer como apoio secundário, não como eixo do treinamento inicial.

### 9.9. π e memória numérica — harness especializado

O módulo de π só será lançado quando houver um fluxo mnemônico completo. A proposta inicial é usar um sistema PAO ou equivalente para pares de dígitos, combinado com palácio da memória e repetição espaçada.

Princípios:

- não ensinar os dígitos por repetição bruta;
- não exigir que o usuário memorize previamente todas as associações 00–99;
- introduzir códigos conforme forem necessários;
- treinar número → imagem e imagem → número;
- ensinar criação de cenas memoráveis;
- construir loci de forma guiada;
- diagnosticar separadamente falhas de código, cena, locus, tradução e transição;
- testar recuperação a partir de pontos intermediários;
- revisar blocos fracos sem exigir sempre recitação desde o começo.

Etapas previstas:

1. Demonstração de codificação de números em imagens.
2. Escolha ou criação incremental de associações.
3. Treino bidirecional das associações necessárias.
4. Introdução a cenas PAO.
5. Criação de um pequeno palácio e definição da ordem dos loci.
6. Codificação guiada do primeiro bloco de π.
7. Recuperação por locus e tradução de volta para dígitos.
8. Consolidação espaçada.
9. Ampliação incremental do palácio e da sequência.
10. Recitação livre, retomada intermediária e testes de retenção.

---

## 10. Catálogo inicial e roadmap de capacidades

A ordem deve ser determinada tanto pela facilidade de implementação quanto pela capacidade transversal que cada módulo adiciona à plataforma.

### Fase 0 — Fundação técnica e editorial

Entregas:

- esquema de conteúdo versionado;
- pipeline de ingestão e curadoria;
- engine de sessões;
- estado de habilidade;
- agendador de revisão substituível;
- sistema de resposta e histórico;
- componentes básicos de exercício;
- acessibilidade mínima;
- página de fontes e atribuições;
- testes de validação de conteúdo.

### Fase 1 — Bandeiras do mundo

**Capacidade nova:** reconhecimento visual canônico.

Escopo:

- bandeira → país;
- país → bandeira;
- continentes como trilhas editoriais;
- conjuntos de bandeiras confundíveis;
- diagnóstico inicial;
- repetição espaçada;
- domínio por direção;
- conquista de coleção;
- progresso não competitivo.

### Fase 2 — Capitais e geografia relacional

**Capacidade nova:** associação factual bidirecional.

Escopo:

- país → capital;
- capital → país;
- agrupamento por continente;
- respostas digitadas e normalização;
- integração opcional com o domínio já adquirido de bandeiras.

### Fase 3 — Países e estados no mapa

**Capacidade nova:** localização espacial.

Escopo:

- localizar países;
- identificar país destacado;
- estados e capitais do Brasil;
- relações de vizinhança em etapa posterior.

### Fase 4 — Elementos químicos

**Capacidade nova:** conhecimento em camadas.

Primeira camada:

- símbolo → nome;
- nome → símbolo;
- número atômico.

Camadas posteriores:

- posição na tabela;
- grupo e período;
- famílias;
- estado físico;
- propriedades e usos selecionados.

### Fase 5 — Instrumentos musicais

**Capacidade nova:** multimodalidade e discriminação auditiva.

Primeira coleção recomendada:

- instrumentos comuns e instrumentos da orquestra;
- imagem → nome;
- áudio isolado → instrumento;
- família instrumental.

O lançamento inicial deve ser pequeno e curado, com vários áudios por instrumento.

### Fase 6 — Presidentes do Brasil

**Capacidade nova:** sequência e linha do tempo.

Camadas:

- retrato → nome;
- nome → retrato;
- ordem;
- período de governo;
- predecessor e sucessor;
- contextos históricos selecionados posteriormente.

### Fase 7 — Animais ou aves brasileiras

**Capacidade nova:** reconhecimento visual generalizável.

A coleção deverá ser delimitada editorialmente, por exemplo:

- 50 aves brasileiras comuns;
- 100 animais da fauna brasileira;
- animais da Mata Atlântica;
- animais do Cerrado.

Não haverá uma coleção vaga chamada “todos os animais”.

### Fase 8 — Futebol e história das Copas

**Capacidade reutilizada:** associação, sequência e estatísticas em camadas.

Primeiras camadas possíveis:

- ano → campeão;
- campeão → anos de título;
- país-sede;
- finalistas;
- placar da final;
- artilheiro;
- trajetória de seleções.

O foco inicial deverá ser em dados históricos delimitados e não em elencos ou clubes continuamente mutáveis.

### Fase 9 — Código Morse

**Capacidade nova:** aquisição auditiva temporal especializada.

Só deve ser iniciado quando houver tempo para desenhar e testar o método, e não apenas exibir uma tabela.

### Fase 10 — π e técnicas de memória

**Capacidade nova:** sistema mnemônico, criação de conteúdo pessoal estruturado e palácio da memória.

Será tratado como uma experiência própria dentro da plataforma.

---

## 11. Escopo detalhado do MVP de bandeiras

### 11.1. Objetivo do usuário

A pessoa deve conseguir reconhecer e recordar as bandeiras incluídas na coleção oficial, com retenção ao longo do tempo e atenção especial às bandeiras que costuma confundir.

### 11.2. Política de escopo geopolítico

A lista de entidades deve ser editorialmente definida e versionada. O projeto deverá documentar:

- critérios para inclusão de países e territórios;
- nomenclatura principal em português;
- nomes alternativos aceitos;
- tratamento de disputas e mudanças;
- fonte usada para cada registro.

A interface deve evitar apresentar decisões editoriais controversas como verdades incontestáveis. Alterações precisam ser versionadas.

### 11.3. Modos de exercício

Quatro modos são obrigatórios no MVP: bandeira → país em múltipla escolha e em resposta digitada, país → bandeira em seleção visual, e o contraste de bandeiras confundíveis — este último decidido em [ADR-0006](adr/0006-contraste-como-exercicio-de-primeira-classe.md) e ainda pendente.

A tabela que diz **que evidência cada exercício produz** — e que serve de teste para admitir ou recusar qualquer exercício novo — está em [`HARNESS-VISUAL.md`](HARNESS-VISUAL.md), seção 2.

Previstos para depois: bandeira parcialmente ocultada, reconstrução de elementos, explicação de símbolos, bandeiras históricas, proporções e detalhes.

### 11.4. Progressão

A pessoa poderá:

- iniciar por uma trilha recomendada;
- escolher uma região;
- realizar diagnóstico;
- aprender pequenos lotes;
- revisar itens vencidos;
- praticar apenas confusões;
- fazer uma avaliação de consolidação.

Uma trilha sugerida poderá começar por regiões menores e visualmente distintas e avançar para conjuntos mais confundíveis. A ordem deverá ser configurável editorialmente, não codificada na interface.

### 11.5. Distratores

Distratores não devem ser sempre aleatórios: precisam considerar semelhança visual, mesma região, erros anteriores da pessoa, nível de dificuldade e equilíbrio de posição da resposta. A política implementada, o que ela cobre e o que ela comprovadamente não enxerga estão em [`HARNESS-VISUAL.md`](HARNESS-VISUAL.md), seção 4.

### 11.6. Introdução de uma nova bandeira

A introdução deve ser curta e imediatamente seguida de recuperação ativa, podendo mostrar a bandeira, o nome, a localização regional, a característica visual distintiva e o contraste com uma bandeira próxima. O desenho implementado — e o que dele ainda falta — está em [`HARNESS-VISUAL.md`](HARNESS-VISUAL.md), seção 3.

### 11.7. Critério de domínio sugerido

Uma bandeira dominada em uma direção exige acertos sem ajuda, revisões em dias diferentes, discriminação correta contra item confundível quando aplicável, retenção acima do limiar e aprovação em avaliação de consolidação. A coleção completa exigirá domínio nas direções obrigatórias e uma avaliação final.

O critério implementado, as razões que ele devolve quando não é atendido, e os dois requisitos que ainda faltam estão em [`HARNESS-VISUAL.md`](HARNESS-VISUAL.md), seção 10.

### 11.8. Conquistas iniciais

Exemplos:

- Bandeiras da América do Sul;
- Bandeiras da África;
- Bandeiras da Europa;
- Bandeiras da Ásia;
- Bandeiras da Oceania;
- Mundo em Bandeiras;
- Especialista em Tricolores;
- Sem Confusão: dominar um conjunto de bandeiras visualmente próximas.

Conquistas deverão representar capacidade, não apenas contagem de cliques.

---

## 12. Experiência do usuário

### 12.1. Navegação principal

Estrutura inicial sugerida:

- **Início** — sessão recomendada e progresso recente;
- **Coleções** — catálogo oficial;
- **Aprender** — sessão atual;
- **Progresso** — domínio por coleção, região, entidade e habilidade;
- **Conquistas** — marcos alcançados;
- **Perfil/Configurações** — preferências, acessibilidade e sincronização.

### 12.2. Tela inicial

Deve responder rapidamente:

- O que estou aprendendo?
- O que preciso revisar hoje?
- Qual é o próximo pequeno passo?
- O que já conquistei?

Não deve enfatizar:

- ranking;
- comparação;
- tempo gasto;
- sequência diária como obrigação.

### 12.3. Sessão

Uma sessão deve:

- informar duração ou quantidade aproximada;
- apresentar uma tarefa por vez;
- aceitar teclado sempre que possível;
- fornecer feedback imediato e informativo;
- permitir pausar ou encerrar;
- terminar com resumo de aprendizados, confusões e próxima revisão.

### 12.4. Feedback de erro

Ao errar, o sistema deverá preferir feedback específico:

> Esta é a bandeira do Chade. Ela é frequentemente confundida com a da Romênia; o azul do Chade é mais escuro.

em vez de apenas:

> Errado.

O feedback não deve ser longo a ponto de interromper o ritmo.

### 12.5. Progresso

O progresso deve mostrar conhecimento de forma legível:

```text
Brasil
✓ bandeira → país
✓ país → bandeira
○ capital
○ localização
```

Também deve ser possível visualizar:

- dominado;
- consolidando;
- precisa de revisão;
- ainda não iniciado;
- principais confusões.

---

## 13. Sistema de conquistas

### 13.1. Princípio

Uma conquista deve descrever algo que a pessoa agora consegue fazer.

Boas conquistas:

- reconhecer todas as bandeiras da América do Sul;
- localizar todos os estados brasileiros;
- identificar instrumentos de cordas pelo som;
- recitar cem dígitos de π a partir de loci definidos.

Conquistas fracas:

- abrir o app sete dias;
- responder mil questões;
- passar duas horas na plataforma.

Métricas de atividade podem existir de forma privada, mas não devem ser a base principal de identidade.

### 13.2. Evidência da conquista

Uma conquista poderá registrar:

- data de obtenção;
- coleção e versão;
- habilidades exigidas;
- avaliação que a validou;
- última confirmação de retenção;
- status atual: ativa ou precisando de renovação.

### 13.3. Compartilhamento

Em fase posterior, uma conquista poderá gerar:

- página pública opcional;
- cartão de compartilhamento;
- certificado simples;
- link com descrição da habilidade validada.

Tudo deverá ser privado por padrão.

---

## 14. Funcionalidades sociais

### 14.1. Fora do MVP

Não implementar inicialmente:

- criação de desafios por usuários;
- decks públicos;
- comentários;
- ranking;
- seguidores irrestritos;
- feed algorítmico;
- mensagens privadas;
- grupos públicos;
- competição síncrona.

### 14.2. Primeira camada social possível

Após validação do núcleo pedagógico:

- perfil opcional de conquistas;
- escolha do que exibir;
- compartilhar uma conquista;
- adicionar amigos por convite;
- ver marcos recentes de amigos;
- recomendar uma coleção oficial;
- estudar a mesma coleção sem comparação numérica.

Antes de oferecer funcionalidades sociais a menores de idade, será necessária uma revisão específica de privacidade, segurança, consentimento e regras aplicáveis a dados de crianças e adolescentes.

---

## 15. Arquitetura técnica recomendada

### 15.1. Princípios

- web app responsivo e instalável como PWA;
- funcionamento rápido em desktop e celular;
- conteúdo versionado e reproduzível;
- progresso local-first sempre que possível;
- backend opcional para sincronização e social;
- separação estrita entre engine, harness e coleção;
- baixo custo operacional;
- ausência de dependência de scraping em tempo de execução.

### 15.2. Stack inicial sugerida

A decisão final poderá mudar, mas o padrão recomendado é:

- **Frontend:** React + TypeScript;
- **Framework:** Next.js ou alternativa equivalente;
- **UI:** componentes acessíveis e próprios, com biblioteca base leve;
- **Estado local:** IndexedDB;
- **Backend/sincronização futura:** Postgres/Supabase ou serviço equivalente;
- **Autenticação futura:** magic link, OAuth ou passkey;
- **Conteúdo:** manifestos JSON versionados no repositório;
- **Pipeline de ingestão:** Python;
- **Assets:** arquivos estáticos otimizados e armazenamento de objetos quando necessário;
- **Testes:** unitários, validação de conteúdo e E2E.

O MVP poderá funcionar sem conta. A sincronização deverá ser adicionada depois sem alterar o modelo conceitual de progresso.

### 15.3. Organização do repositório

**Superada por [ADR-0002](adr/0002-app-unico-sem-monorepo.md).** A divisão em `apps/` e `packages/` originalmente proposta aqui foi descartada enquanto houver um único harness: as fronteiras entre engine, harness e coleção são mantidas como invariantes verificáveis dentro de `src/`, e não como limites de pacote.

A reorganização intermediária — `src/engine/`, `src/harnesses/` e `src/content/`, tornando o vocabulário desta spec visível no caminho dos arquivos — segue desejável e está registrada como issue. O sinal para executá-la é o segundo harness.

### 15.4. Interface entre engine e harness

Exemplo conceitual em TypeScript:

```ts
interface LearningHarness {
  id: string;
  supportedSkillTypes: string[];

  introduce(context: IntroductionContext): LearningActivity;
  generateActivity(context: ActivityContext): LearningActivity;
  evaluate(activity: LearningActivity, response: UserResponse): Evaluation;
  selectConfusions(context: ConfusionContext): EntityId[];
  assessMastery(context: MasteryContext): MasteryAssessment;
}
```

A engine não deverá conhecer regras específicas de bandeiras, instrumentos ou π.

---

## 16. Modelo de conteúdo

### 16.1. Entidades principais

```ts
interface Collection {
  id: string;
  version: string;
  title: string;
  description: string;
  status: "draft" | "published" | "archived";
  harnesses: string[];
  curriculumNodeIds: string[];
  sourceIds: string[];
}

interface Entity {
  id: string;
  type: string;
  canonicalName: LocalizedText;
  aliases: LocalizedText[];
  attributes: Record<string, unknown>;
  mediaAssetIds: string[];
  sourceIds: string[];
}

interface SkillDefinition {
  id: string;
  collectionId: string;
  skillType: string;
  entityType: string;
  direction?: string;
  requiredForCompletion: boolean;
  masteryPolicyId: string;
  harnessId: string;
}

interface MediaAsset {
  id: string;
  type: "image" | "audio" | "video" | "svg";
  uri: string;
  entityIds: string[];
  role: "canonical" | "training" | "evaluation" | "explanation";
  author?: string;
  license: string;
  sourceUrl: string;
  attributionText: string;
  metadata: Record<string, unknown>;
}

interface ConfusionSet {
  id: string;
  collectionId: string;
  entityIds: string[];
  rationale: string;
  skillTypes: string[];
  difficulty: number;
}
```

### 16.2. Currículo

```ts
interface CurriculumNode {
  id: string;
  collectionId: string;
  title: string;
  entityIds: string[];
  skillDefinitionIds: string[];
  prerequisiteNodeIds: string[];
  unlockPolicy: UnlockPolicy;
  order: number;
}
```

O currículo deve ser dados, não lógica codificada em componentes.

### 16.3. Fontes

Todo fato e mídia deverá ser rastreável.

```ts
interface Source {
  id: string;
  title: string;
  url: string;
  retrievedAt: string;
  license?: string;
  notes?: string;
}
```

---

## 17. Modelo de progresso do usuário

```ts
interface UserSkillState {
  userId: string;
  collectionId: string;
  entityId: string;
  skillDefinitionId: string;

  status: "new" | "learning" | "consolidating" | "mastered" | "review";
  stability?: number;
  difficulty?: number;
  retrievability?: number;

  firstSeenAt?: string;
  lastReviewedAt?: string;
  nextReviewAt?: string;

  attempts: number;
  correctAttempts: number;
  hintsUsed: number;
  recentErrorCodes: string[];
  seenExemplarIds: string[];
  schedulerState: Record<string, unknown>;
}

interface ReviewEvent {
  id: string;
  userId: string;
  occurredAt: string;
  collectionId: string;
  entityId: string;
  skillDefinitionId: string;
  activityType: string;
  exemplarIds: string[];
  response: unknown;
  evaluation: Evaluation;
  durationMs: number;
  schedulerBefore: Record<string, unknown>;
  schedulerAfter: Record<string, unknown>;
}
```

O histórico de eventos deverá ser preservado para permitir auditoria do agendamento, análise pedagógica e migração futura de algoritmo.

---

## 18. Pipeline de ingestão e curadoria

### 18.1. Regra geral

Fontes externas servem para **descobrir e obter candidatos**. O produto publicado deve usar um snapshot validado e versionado.

Fluxo:

```text
fonte externa
→ captura bruta
→ normalização
→ validações automáticas
→ fila de curadoria
→ seleção e correção humana
→ processamento de mídia
→ manifesto publicado
→ testes de regressão
```

### 18.2. Requisitos de ingestão

Cada adaptador de fonte deverá:

- guardar a resposta bruta ou um snapshot reproduzível;
- registrar data de obtenção;
- mapear identificadores externos;
- preservar autoria e licença;
- detectar itens removidos ou alterados;
- não sobrescrever silenciosamente decisões editoriais;
- produzir relatório de diferenças.

### 18.3. Curadoria de imagem

Para cada imagem, verificar:

- se representa corretamente a entidade;
- se tem resolução suficiente;
- se não contém texto ou pistas indevidas;
- se a licença permite o uso desejado;
- se a atribuição está completa;
- se é apropriada como treino, avaliação ou explicação;
- se há diversidade suficiente de exemplares.

### 18.4. Curadoria de áudio

Para cada áudio, verificar:

- instrumento ou fonte sonora correta;
- ausência de outros sons dominantes;
- duração útil;
- qualidade;
- nível de volume;
- início e fim adequados;
- registro ou nota tocada;
- presença de fala;
- licença e atribuição;
- pistas acidentais no nome do arquivo ou interface.

O pipeline poderá normalizar loudness, recortar silêncio e converter formato, preservando o original e os metadados de licença.

### 18.5. Validações automáticas

Exemplos:

- IDs únicos;
- campos obrigatórios;
- relações apontando para entidades existentes;
- fontes presentes;
- licença presente para toda mídia;
- arquivos acessíveis;
- nenhum distrator idêntico à resposta;
- respostas alternativas sem colisões;
- currículo sem ciclos indevidos;
- todas as habilidades obrigatórias cobertas;
- assets de avaliação não usados no treino quando o harness exigir separação.

---

## 19. Dados e mídia por módulo

### 19.1. Bandeiras

Fonte ideal:

- imagens vetoriais canônicas;
- lista editorial de entidades;
- nomes e aliases em português;
- metadados de fonte e licença.

Complexidade de ingestão: baixa.

### 19.2. Capitais

Fonte ideal:

- tabela estruturada e revisada;
- tratamento explícito de múltiplas capitais, sedes administrativas e exceções.

Complexidade de ingestão: baixa; complexidade editorial: média em exceções.

### 19.3. Elementos químicos

Fonte ideal:

- tabela estruturada estável;
- atributos adicionados por camada;
- fontes científicas registradas.

Complexidade de ingestão: baixa.

### 19.4. Instrumentos

Fonte ideal:

- taxonomia editorial própria;
- imagens abertas;
- múltiplos áudios curados por instrumento;
- metadados sobre técnica, nota, registro e família.

Complexidade de ingestão: média; curadoria: alta.

### 19.5. Animais e aves

Fonte ideal:

- lista editorial delimitada;
- taxonomia e nomes populares;
- múltiplas fotografias abertas;
- divisão treino/avaliação;
- informações de habitat e distribuição em camadas posteriores.

Complexidade de ingestão: média; curadoria e generalização: altas.

### 19.6. Presidentes

Fonte ideal:

- lista ordenada versionada;
- mandatos como entidades separadas quando necessário;
- retratos abertos;
- relações de predecessor e sucessor;
- eventos adicionados apenas com curadoria historiográfica.

Complexidade de ingestão: baixa; modelagem de exceções: média.

### 19.7. Futebol

Fonte ideal:

- datasets históricos versionados;
- escopo inicial restrito a Copas já concluídas;
- imagens apenas quando houver licenciamento claro.

Complexidade de ingestão: baixa a média para fatos; alta para mídia e expansão contínua.

---

## 20. Multimodalidade

### 20.1. Princípio

Imagem, áudio, texto e interação espacial devem representar habilidades distintas. Saber identificar um instrumento pela foto não implica reconhecê-lo pelo som.

### 20.2. Separação de estados

Exemplo:

```text
Oboé
✓ imagem → nome
○ áudio → nome
✓ nome → família
○ distinguir de clarinete
```

### 20.3. Generalização

Para conteúdos com múltiplos exemplares, o sistema deverá separar:

- exemplares de introdução;
- exemplares de prática;
- exemplares de consolidação;
- exemplares reservados para avaliação de generalização.

### 20.4. Offline

O aplicativo poderá permitir baixar uma coleção e suas mídias para uso offline. Áudios e imagens devem ter versões otimizadas e manifestos de cache.

---

## 21. Métricas

### 21.1. Métricas principais de aprendizagem

- retenção após intervalo;
- probabilidade de recuperação;
- redução de confusões específicas;
- desempenho em exemplares novos;
- capacidade de responder em direções diferentes;
- tempo até domínio;
- taxa de reativação de habilidade enferrujada;
- desempenho em avaliação de consolidação.

### 21.2. Métricas de produto

- início e conclusão de sessões;
- retorno voluntário;
- conclusão de coleções;
- abandono por etapa;
- uso de diagnóstico;
- dificuldade percebida;
- proporção entre revisão e conteúdo novo;
- erros técnicos durante atividades.

### 21.3. Métricas que não devem orientar o produto isoladamente

- tempo total no aplicativo;
- quantidade bruta de cliques;
- sequência diária;
- número de notificações abertas;
- comparação com outros usuários.

### 21.4. Avaliação do harness

Um harness poderá ser considerado inadequado se usuários:

- acertarem apenas mídias já vistas;
- esquecerem rapidamente apesar de alta pontuação;
- aprenderem atalhos visuais irrelevantes;
- apresentarem confusões que o sistema não diagnostica;
- concluírem atividades sem adquirir a habilidade declarada.

---

## 22. Acessibilidade e inclusão

Requisitos mínimos:

- navegação completa por teclado;
- foco visível;
- compatibilidade com leitores de tela;
- texto alternativo apropriado, sem revelar respostas durante a questão;
- legendas e alternativas para conteúdo auditivo quando a habilidade não for especificamente auditiva;
- modo de movimento reduzido;
- contraste adequado;
- não depender exclusivamente de cor;
- fontes redimensionáveis;
- tolerância configurável de tempo;
- normalização de respostas com acentuação e variações linguísticas;
- linguagem não infantilizada;
- celebrações visuais e sonoras desativáveis.

Em módulos cujo objetivo é necessariamente auditivo ou visual, a plataforma deverá explicar claramente a exigência e oferecer outras coleções acessíveis, sem fingir equivalência pedagógica onde ela não existe.

---

## 23. Privacidade e ética

- coletar apenas os dados necessários;
- permitir uso local sem conta no MVP;
- tornar perfis privados por padrão;
- não vender dados;
- não usar publicidade comportamental;
- não criar dark patterns;
- permitir exportar e apagar progresso quando houver conta;
- não publicar atividade de menores por padrão;
- revisar requisitos legais e de segurança antes de lançar recursos sociais;
- documentar fontes e correções editoriais;
- criar canal para reportar erro factual ou problema de licença.

---

## 24. Requisitos não funcionais

### 24.1. Desempenho

- primeira interação rápida em conexão comum;
- feedback após resposta sem atraso perceptível;
- pré-carregamento do próximo asset da sessão;
- imagens e áudios otimizados;
- sessões funcionais em dispositivos modestos.

### 24.2. Confiabilidade

- progresso salvo localmente após cada resposta;
- sincronização idempotente quando houver backend;
- conteúdo versionado;
- migrações testadas;
- funcionamento offline para coleções baixadas.

### 24.3. Testabilidade

- geração de atividades determinística sob seed em testes;
- avaliadores de resposta com testes unitários;
- fixtures de conteúdo;
- testes de regressão do scheduler;
- testes E2E das jornadas principais;
- validação automática de licenças e fontes.

### 24.4. Observabilidade

- erros técnicos com contexto suficiente;
- eventos de aprendizagem anonimizados quando possível;
- separação entre telemetria pedagógica e dados de identidade;
- painel simples para detectar conteúdo com taxa anormal de erro.

---

## 25. Critérios de aceitação do MVP

O MVP de bandeiras estará pronto quando:

1. A pessoa puder usar o aplicativo sem criar conta.
2. O conteúdo oficial estiver versionado, validado e acompanhado de fontes e licenças.
3. Houver diagnóstico inicial funcional.
4. O sistema oferecer bandeira → país e país → bandeira.
5. Respostas digitadas aceitarem aliases e variações previstas.
6. O scheduler armazenar estado por habilidade e programar revisões.
7. A sessão combinar revisões, itens novos e confusões.
8. O progresso mostrar estados por entidade e habilidade.
9. Houver pelo menos uma trilha regional completa.
10. Conjuntos de bandeiras confundíveis forem praticados em contraste.
11. Uma conquista depender de evidência de domínio, não de mera conclusão de tela.
12. O aplicativo funcionar por teclado e em celular.
13. O progresso persistir após fechar e reabrir.
14. Houver testes de conteúdo, resposta, agendamento e fluxo principal.
15. A interface não contiver ranking, streak punitiva ou criação de desafios.

---

## 26. Definition of Done para um novo módulo

Um módulo só pode ser publicado quando todos os itens abaixo forem atendidos.

### Produto

- [ ] A conquista é clara e desejável.
- [ ] O escopo é delimitado.
- [ ] O público entende o que será capaz de fazer.
- [ ] A progressão inicial está definida.
- [ ] Há uma experiência de conclusão e consolidação.

### Pedagogia

- [ ] A unidade de habilidade foi definida.
- [ ] O harness é apropriado ao domínio.
- [ ] O diagnóstico foi desenhado.
- [ ] A introdução de itens foi desenhada.
- [ ] Há recuperação ativa.
- [ ] Há revisão espaçada.
- [ ] Há tratamento de confusões.
- [ ] Há critério de domínio.
- [ ] Há teste de retenção.
- [ ] Há teste de generalização quando pertinente.
- [ ] Não há estratégia ruim adotada apenas por facilidade técnica.

### Conteúdo

- [ ] Lista editorial de entidades fechada e versionada.
- [ ] Fatos revisados.
- [ ] Nomes alternativos definidos.
- [ ] Fontes registradas.
- [ ] Licenças verificadas.
- [ ] Mídias curadas.
- [ ] Distratores revisados.
- [ ] Conjuntos de confusão definidos.
- [ ] Testes automáticos passam.

### Engenharia

- [ ] Harness implementado sem acoplamento indevido à coleção.
- [ ] Estado por habilidade persistido.
- [ ] Atividades acessíveis.
- [ ] Fluxo offline avaliado.
- [ ] Testes unitários e E2E presentes.
- [ ] Telemetria pedagógica mínima definida.
- [ ] Migração de conteúdo documentada.

---

## 27. Backlog inicial

### P0 e P1 — bandeiras

Movidos para [`MVP-BACKLOG.md`](MVP-BACKLOG.md), que é onde vivem a sequência, as dependências e os critérios de aceitação verificáveis. A maior parte do P0 original está feita; o que resta não é infraestrutura, é aprendizado — contraste entre confundíveis, feedback que fala da bandeira, currículo editorial, diagnóstico amostral.

O status de cada item vive nas issues do repositório, não em caixas de seleção deste documento.

### P2 — Primeiro reaproveitamento da engine

- [ ] Capitais do mundo.
- [ ] Harness de associação bidirecional.
- [ ] Entidade compartilhada entre bandeira e capital.
- [ ] Domínio em múltiplas habilidades por país.

### P3 — Primeira expansão estrutural

- [ ] Mapa interativo.
- [ ] Estados e capitais do Brasil.
- [ ] Harness espacial.

### P4 — Conteúdo em camadas

- [ ] Elementos químicos.
- [ ] Visualização de domínio por atributo.
- [ ] Currículo com desbloqueio de camadas.

### P5 — Multimodalidade

- [ ] Taxonomia inicial de instrumentos.
- [ ] Pipeline de curadoria de áudio.
- [ ] Player de atividade sem pistas acidentais.
- [ ] Harness auditivo.
- [ ] Separação entre exemplares de treino e avaliação.

---

## 28. Decisões já tomadas

1. O catálogo será curado.
2. Usuários não criarão desafios no escopo inicial.
3. Não haverá ranking global.
4. O aspecto social será posterior e baseado em conquistas, não comparação.
5. O produto será lúdico, mas não infantil.
6. O objetivo é conquista pessoal de conhecimento, não utilidade imediata.
7. Cada tipo de conhecimento deverá ter um harness intencional.
8. π só será lançado com um sistema mnemônico completo.
9. Morse deverá ser ensinado como habilidade auditiva, não como tabela visual.
10. Conteúdos poderão começar por reconhecimento e ganhar camadas posteriores.
11. A primeira implementação será bandeiras.
12. Multimodalidade é uma prioridade, com instrumentos como primeiro candidato forte.
13. O projeto será gratuito e não comercial no horizonte atual.
14. Nenhum outro domínio de conhecimento entra antes de bandeiras funcionar muito bem. As fases 2 a 10 da seção 10 são roadmap, não fila de trabalho.

---

## 29. Questões em aberto

Oito das treze foram respondidas pelo próprio código, e agora estão registradas onde podem ser auditadas. As cinco que seguem abertas não impedem o MVP; duas delas bloqueiam etapas específicas.

| #   | Questão                                       | Estado                                                              | Onde vive a resposta                                                                      |
| --- | --------------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 1   | Nome do produto                               | Resolvida                                                           | [ADR-0001](adr/0001-renomear-para-brunanki.md)                                            |
| 2   | Next.js, SPA ou outro formato                 | Resolvida                                                           | [ADR-0002](adr/0002-app-unico-sem-monorepo.md)                                            |
| 3   | Algoritmo de repetição espaçada               | Resolvida                                                           | [ADR-0003](adr/0003-fsrs-via-ts-fsrs.md)                                                  |
| 4   | Múltipla escolha antes da digitada, ou ambas  | Resolvida: ambas, encadeadas — a alternativa é andaime e não agenda | [`HARNESS-VISUAL.md`](HARNESS-VISUAL.md), seção 2                                         |
| 5   | Política de países e territórios              | Resolvida                                                           | [ADR-0004](adr/0004-escopo-onu-fifa-santa-se.md) e [`CONTENT-FLAGS.md`](CONTENT-FLAGS.md) |
| 6   | Licença do código e do conteúdo               | **Aberta** — bloqueia publicação, não o MVP                         | não há `LICENSE` no repositório                                                           |
| 7   | Formato de exportação do progresso            | Resolvida                                                           | [ADR-0005](adr/0005-progresso-local-first.md)                                             |
| 8   | Quando introduzir conta e sincronização       | Aberta                                                              | [ADR-0005](adr/0005-progresso-local-first.md) fixa que o modelo não a pressupõe           |
| 9   | Grau de explicação histórica e simbólica      | Parcial — a nota editorial existe e hoje só desambigua              | [`CONTENT-FLAGS.md`](CONTENT-FLAGS.md), seção 4                                           |
| 10  | Instrumentos antes ou depois de elementos     | Aberta                                                              | fora do escopo enquanto valer a decisão 14                                                |
| 11  | Sistema mnemônico numérico do módulo de π     | Aberta                                                              | fora do escopo                                                                            |
| 12  | Conquista mantida vs. precisando de renovação | Aberta                                                              | depende do sistema de conquistas, que não existe                                          |
| 13  | Política de idade                             | **Aberta** — bloqueia qualquer recurso social                       | —                                                                                         |

---

## 30. Documentos derivados

Os quatro documentos de execução que esta seção recomendava existem:

- [`adr/`](adr/) — as decisões estruturais, cada uma com a alternativa que foi de fato descartada;
- [`CONTENT-FLAGS.md`](CONTENT-FLAGS.md) — escopo geopolítico, fontes, aliases, casos disputados e regras de curadoria;
- [`HARNESS-VISUAL.md`](HARNESS-VISUAL.md) — atividades e a evidência de cada uma, distratores, correção, diagnóstico e critério de domínio;
- [`MVP-BACKLOG.md`](MVP-BACKLOG.md) — sequência, dependências e critérios de aceitação verificáveis.

As convenções de quem escreve o código estão em [`../CLAUDE.md`](../CLAUDE.md).

A fatia vertical que valida a tese central continua sendo o critério de pronto:

```text
abrir o app
→ realizar um diagnóstico curto
→ aprender cinco bandeiras
→ revisar uma confusão
→ fechar o app
→ retornar depois
→ receber a revisão correta
→ ver domínio por habilidade
```

Essa fatia valida a tese central antes de expandir o catálogo.
