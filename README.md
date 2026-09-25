# brunanki

O Brunanki é um webapp em pt-BR para aprender e revisar as bandeiras dos Estados reconhecidos pela ONU. O catálogo reúne os 193 Estados-membros mais os dois observadores permanentes, a Santa Sé e a Palestina, totalizando 195 entidades de aprendizagem.

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

A procedência e a licença de cada imagem estão em [`docs/atribuicao-de-bandeiras.md`](docs/atribuicao-de-bandeiras.md), gerado do catálogo por `pnpm data:attribution` e conferido por `pnpm data:validate` — editar à mão falha o gate. A atribuição que a licença exige também aparece no produto, na página de detalhe de cada bandeira.

A ONU define a elegibilidade, e a regra vive em `scripts/catalog-rules.ts` — o mesmo módulo que o gerador aplica, o validador cobra e os testes exercitam contra o artefato commitado. Wikidata é usado para localizar os arquivos e o Wikimedia Commons fornece as imagens e metadados de licença. Os arquivos são fixados em `public/flags`; o app não faz hotlink em runtime. `src/data/catalog.json` e `src/data/runtime-catalog.json` são artefatos versionados gerados pelo pipeline.

Para conferir mudanças nas fontes e reconstruir os artefatos:

```bash
pnpm data:refresh
pnpm data:validate
```

O refresh nunca publica mudanças por conta própria: ele produz um diff para revisão. Overrides editoriais registram casos como Taiwan e Chinese Taipei, Irlanda do Norte, Vaticano e Santa Sé, e o anverso do Paraguai.

## Hospedagem

O deploy no Fly.io foi desativado.
