# Especificação editorial — coleção de bandeiras

Este documento é dono das **regras** da coleção: que entidades entram, com que nome, com que bandeira, e o que se faz quando as fontes discordam. A **lista** resultante não vive aqui: ela é `src/data/catalog.json`, artefato versionado que `pnpm data:refresh` gera e `pnpm data:validate` verifica. Copiar as 220 entidades para cá criaria uma segunda fonte que envelheceria em silêncio.

O contrato de dados está em `src/types/catalog.ts`; o desenho pedagógico que consome esta coleção está em [`HARNESS-VISUAL.md`](HARNESS-VISUAL.md).

## 1. Escopo: quem entra

A coleção é a **união** de três conjuntos, e soma exatamente 220 entidades — número fixado como invariante em `scripts/refresh-catalog.ts` e reverificado em `scripts/validate-catalog.ts`.

**Os 193 Estados-membros da ONU.** Derivados do campo `unMember` do snapshot do REST Countries, com uma correção explícita: Guiné-Bissau vem marcada incorretamente na fonte e é acrescentada à mão. A correção é codificada em vez de silenciosa justamente para que a invariante de 193 continue revisável em vez de acomodar um registro malformado.

**As 211 associações da FIFA.** Quatro delas — Inglaterra, Escócia, País de Gales e Irlanda do Norte — não têm código ISO 3166 e são declaradas como entidades especiais, com identificador próprio (`england`, `scotland`, `wales`, `northern-ireland`) em vez de código de três letras. As demais são casadas a um país por código FIFA, código ISO ou nome, com três mapeamentos manuais onde a heurística não resolve: Kosovo (`KOS` → `UNK`), Singapura (`SGP`) e Taiti (`TAH` → Polinésia Francesa).

**A Santa Sé**, incluída por decisão editorial e não por consulta: ela é Estado observador permanente da ONU, não membro, e não é associação da FIFA. Sem esta linha, o Vaticano ficaria de fora de uma coleção que qualquer pessoa esperaria encontrá-lo.

A Palestina também é observadora da ONU, e entra pelo mesmo caminho. Uma consequência conhecida: a distinção entre membro e observador existe no catálogo completo, mas **não sobrevive à projeção para o navegador** — `src/data/project-runtime-catalog.ts` reduz as filiações a uma lista de organizações, de modo que Vaticano e Palestina aparecem na interface apenas como "ONU". A interface, portanto, não pode hoje afirmar nada sobre estatuto de membro sem passar a projetar esse campo.

**Não entram** territórios sem representação na ONU ou na FIFA, ainda que tenham código ISO e bandeira própria. O critério é filiação institucional declarada, não soberania — que é uma pergunta que o produto não tem como responder e não deveria fingir responder.

## 2. Fontes

Nenhuma fonte é consultada em tempo de execução. O pipeline produz um snapshot, o snapshot é revisado, e é ele que o aplicativo lê.

| Fonte                                             | Serve para                                                     | Observação                                                                         |
| ------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| REST Countries (snapshot no GitLab)               | filiação à ONU, nomes, traduções, grafias alternativas, região |                                                                                    |
| Wikipédia em inglês, `List_of_FIFA_country_codes` | as 211 associações e seus códigos                              | A FIFA não publica isso em formato consumível; a página é raspada da API MediaWiki |
| Wikidata (SPARQL)                                 | localizar o arquivo de bandeira de cada ISO 3166 alpha-3       |                                                                                    |
| Wikimedia Commons                                 | o arquivo, o hash, as dimensões, a licença e a atribuição      |                                                                                    |

As URLs institucionais da ONU e da FIFA são gravadas como procedência em cada filiação, mas **não são baixadas** — elas dizem de onde vem a autoridade da afirmação, não de onde veio o byte.

Uma limitação a ter em conta: quando o Wikidata devolve mais de uma bandeira para o mesmo código, vence o último resultado da resposta, sem critério de preferência. Onde isso importava, a escolha foi fixada à mão (seção 4).

## 3. Nomenclatura em português e aliases

O nome de exibição é, em ordem de precedência: um override editorial, a tradução para o português do REST Countries, ou o nome comum em inglês. Há **38 overrides**, e eles existem porque a tradução automática da fonte produz formas que ninguém escreve — de "Chéquia", "Essuatíni" e "Macedônia do Norte" a acentuação que a fonte perde.

Os aliases aceitos na resposta digitada reúnem o nome comum, o nome oficial, a tradução oficial, as grafias alternativas da fonte e o nome institucional da FIFA. São desduplicados pela forma normalizada, mas **gravados na grafia original**: a normalização decide o que é igual, não como se escreve.

A normalização é uma só, `normalizeCountryName` em `src/domain/text.ts`, e vale tanto para o pipeline quanto para a correção da resposta — decompõe em NFD, remove as marcas diacríticas, minúsculas em pt-BR, troca tudo que não é letra ou número por espaço. A ordem importa: decompor antes de remover é o que faz "Vietnã" e "Vietna" colidirem.

Um alias nunca pode colidir, depois de normalizado, com o nome ou alias de outra entidade. `pnpm data:validate` falha nomeando as duas entidades em conflito, porque um alias ambíguo transforma um acerto legítimo em erro.

## 4. Casos com decisão editorial

Cinco casos não têm resposta que agrade a todo mundo. Em todos, a escolha está registrada no dado e fixada em teste, e três delas aparecem para quem estuda como nota editorial na tela de ensino.

**Taiwan.** A entidade se chama Taiwan, e "Chinese Taipei" — o nome sob o qual a FIFA a inscreve — é preservado como alias aceito. A bandeira é a da República da China. A nota editorial explica exatamente isso a quem está estudando.

**Irlanda do Norte.** A FIFA a representa separadamente. A bandeira ensinada é o Ulster Banner, marcado no dado como `commonly-used` e não como oficial, porque ele não é bandeira oficial vigente — é a mais reconhecida no contexto esportivo. É o único caso em que uma bandeira não oficial é ensinada, e o dado diz isso em vez de disfarçar.

**Paraguai.** É a única bandeira do mundo com faces distintas. O exercício usa o anverso, e o dado registra `side: "obverse"` — que é o único lugar do catálogo onde esse campo não diz "igual dos dois lados".

**Santa Sé e Vaticano.** A entidade aparece como "Vaticano", que é como se fala; a filiação registra "Holy See", que é como a ONU a inscreve; e a bandeira é a do Estado da Cidade do Vaticano. É também a única entidade cujo arquivo é PNG e não SVG.

**Kosovo.** Entra por ser associação da FIFA, com identificador `unk`. Não há nota editorial, e talvez devesse haver.

Estes casos são fixados em `src/data/catalog.test.ts` e reverificados por `pnpm data:validate`, que compara arquivo, estatuto e face esperados. Não é possível trocá-los por acidente de pipeline: só por edição deliberada do teste e do validador.

## 5. Mídia, licença e atribuição

Um arquivo por entidade, baixado do Commons e fixado em `public/flags/`. Nenhum hotlink em tempo de execução — nem por desempenho, nem por privacidade: uma imagem carregada de outro domínio conta ao dono daquele domínio o que a pessoa está estudando.

A integridade é verificada por SHA-1 contra o valor que o Commons declara, na ingestão e de novo na validação. Uma exceção nomeada: o arquivo do Vaticano é um PNG derivado de uma miniatura, e nele o hash gravado é o do arquivo local, porque não há hash upstream com que comparar.

Licença, autor e crédito vêm dos metadados do Commons e são renderizados na página de créditos a partir do catálogo. Aqui existe um risco assumido que convém dizer em voz alta: quando o Commons não declara licença nem termos de uso, o pipeline assume domínio público em vez de falhar. Isso vale para bandeiras — cuja esmagadora maioria é de fato de domínio público — mas é o tipo de conveniência que não deve ser herdada por nenhuma coleção futura de fotografias ou áudios, onde o silêncio da fonte quase nunca significa domínio público.

## 6. Paleta

Cada bandeira tem uma paleta de até onze nomes de cor em português, extraída dos preenchimentos, traços e paradas de gradiente do SVG e quantizada por faixas de matiz e luminosidade. A lista de cores é curta de propósito e serve a dois usos: descrever a bandeira a quem usa leitor de tela, e medir semelhança visual entre bandeiras para escolher distratores.

Duas entidades têm paleta declarada à mão, por impossibilidade técnica e não por gosto: o Vaticano, cujo arquivo é PNG e não tem declaração de cor a ler, e o Afeganistão, cujo texto herda o preto padrão do SVG sem declará-lo.

A consequência pedagógica dessa quantização — que ela ignora tom, ordem, orientação e proporção, e portanto não distingue Chade de Romênia nem Irlanda de Costa do Marfim — é tratada em [`HARNESS-VISUAL.md`](HARNESS-VISUAL.md), que é quem decide o que fazer com essa informação.

## 7. Como o catálogo muda

`pnpm data:refresh` reconsulta as fontes, rebaixa o que mudou de hash e **sobrescreve** os dois artefatos. Ele não pede aprovação e não produz relatório de diferenças: quem detecta a mudança é o git, e quem a aprova é a revisão do diff.

Isso é suficiente hoje, com uma coleção de bandeiras que muda de década em década, e é frágil para qualquer coleção que mude com frequência. A regra que sustenta o arranjo é simples: **o refresh nunca é commitado sem que o diff tenha sido lido**. Um `catalog.json` que mudou sozinho é um bug, não uma atualização.

Alterações editoriais — um nome, um alias, uma nota — mudam o pipeline, não o JSON. Editar o artefato à mão produz um arquivo que o próximo refresh apaga sem avisar.

## 8. O que a validação garante

`pnpm data:validate` roda no CI antes de qualquer outro gate e falha nomeando o caso: as três cardinalidades (220 entidades, 193 membros da ONU, 211 associações da FIFA); a presença do Vaticano como observador; exatamente uma bandeira por entidade; identificadores únicos e QIDs bem formados; títulos e URLs do Commons na forma esperada; licença presente e não vazia; o arquivo existindo em disco com o hash declarado; nenhum alias ambíguo entre entidades; e as quatro decisões editoriais da seção 4, conferidas arquivo por arquivo.

O que ela **não** verifica, e portanto não protege: região, tipo de representação, nomes de origem, datas de verificação e as dimensões declaradas. Três valores previstos nos tipos nunca chegam a ser produzidos — o estatuto `sporting`, a face `reverse` e a confederação da FIFA, que hoje é letra morta. Um tipo que descreve estados que ninguém constrói é uma promessa vazia: ou passa a ser preenchido, ou sai do contrato.

## 9. O currículo editorial

Falta à coleção o artefato que decide **em que ordem** as bandeiras são ensinadas e **quais pares** precisam ser contrastados. Hoje a ordem de introdução é a ordem alfabética do catálogo, o que é o acaso do alfabeto ocupando o lugar de uma decisão pedagógica, e a semelhança visual é inferida por uma heurística que não enxerga tom nem disposição.

O artefato previsto é `src/data/curriculum.json`: **editorial, escrito à mão e validado**, ao contrário dos demais arquivos de `src/data/`, que são gerados. Ele deve conter uma ordem que seja permutação exata dos identificadores do catálogo, e um conjunto de pares ou grupos confundíveis, cada um com a razão da confusão e, para cada par, o traço que os distingue — o texto que o aplicativo mostra quando alguém troca um pelo outro.

A validação deve exigir que a ordem cubra todas as entidades sem repetição, que todo grupo tenha razão e traço distintivo, e — o ponto que evita curadoria de fachada — deve **listar os pares que a heurística considera confundíveis e que não pertencem a nenhum grupo nem a uma lista versionada de exceções justificadas**. Cobertura silenciosamente parcial é o modo mais provável de esse arquivo virar teatro.

O desenho pedagógico correspondente está em [`HARNESS-VISUAL.md`](HARNESS-VISUAL.md); a sequência de implementação, em [`MVP-BACKLOG.md`](MVP-BACKLOG.md).
