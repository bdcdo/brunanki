# brunanki

Há conhecimentos que são bons de ter mesmo sem serem úteis, que têm limite claro e que dão uma sensação nítida de completude: reconhecer todas as bandeiras nacionais, saber as capitais do mundo, identificar instrumentos pelo som. Cursos não os atendem, e baralhos genéricos de flashcards tratam todos eles como se fossem a mesma coisa. O brunanki existe para transformar esse tipo de objetivo numa conquista alcançável — com cada domínio ensinado por uma experiência desenhada para a natureza daquele conhecimento.

A primeira coleção é a das bandeiras: 193 Estados-membros da ONU, 211 associações da FIFA e a Santa Sé como Estado observador, somando 220 entidades de aprendizagem. Ela é também a única, por decisão: nenhum outro domínio entra antes de bandeiras funcionar muito bem. A ideia completa, com os demais domínios previstos e aquilo que o produto recusa ser, está em [`docs/SPEC.md`](docs/SPEC.md).

## Como funciona

O primeiro acesso oferece um diagnóstico retomável e sem alternativas: a pessoa digita o nome da entidade ou pula. Depois, as sessões combinam recordação digitada, reconhecimento na direção inversa e revisão espaçada por FSRS, com alternativas escolhidas entre as bandeiras mais fáceis de confundir com a correta — não sorteadas ao acaso.

Domínio não é sinônimo de acerto: exige as duas direções, recuperações em ocasiões separadas e evidência de retenção ao longo do tempo. Os critérios exatos, e a razão de cada um, estão em [`docs/HARNESS-VISUAL.md`](docs/HARNESS-VISUAL.md).

O progresso fica no IndexedDB do navegador. Não há conta, backend, rastreamento nem sincronização automática. A tela de ajustes exporta e restaura um backup JSON versionado, que é o único jeito de levar o progresso para outro dispositivo.

## Desenvolvimento

Requisitos: Node.js 20 ou mais recente e pnpm.

```bash
pnpm install
pnpm dev
```

Validações, na ordem em que o CI as roda:

```bash
pnpm data:validate
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm test:e2e
```

As convenções do repositório e as fronteiras que o código não cruza estão em [`CLAUDE.md`](CLAUDE.md).

## Catálogo e licenças

ONU e FIFA definem a elegibilidade; os critérios de inclusão, a nomenclatura em português e o tratamento de casos disputados estão em [`docs/CONTENT-FLAGS.md`](docs/CONTENT-FLAGS.md). O Wikidata é usado para localizar os arquivos e o Wikimedia Commons fornece as imagens e os metadados de licença. Os arquivos são fixados em `public/flags`; o aplicativo não faz hotlink em runtime. `src/data/catalog.json` é o artefato versionado que o pipeline gera, com procedência, hash e licença por arquivo — a página de créditos é renderizada a partir dele.

Para conferir mudanças nas fontes e reconstruir os artefatos:

```bash
pnpm data:refresh
pnpm data:validate
```

O refresh nunca publica mudanças por conta própria: ele produz um diff para revisão. Overrides editoriais registram casos como Taiwan e Chinese Taipei, Irlanda do Norte, Vaticano e Santa Sé, e o anverso do Paraguai.

## Hospedagem

O deploy no Fly.io foi desativado.
