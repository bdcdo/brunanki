# Ptanki

Ptanki é um webapp em pt-BR para aprender e revisar as bandeiras dos membros da ONU e das associações da FIFA. O catálogo combina 193 Estados-membros da ONU, 211 associações da FIFA e a Santa Sé como Estado observador, totalizando 220 entidades de aprendizagem.

## Como funciona

O primeiro acesso oferece um diagnóstico completo, retomável e sem alternativas: a pessoa digita o nome da entidade ou pula. Depois, sessões adaptativas combinam recordação digitada, associação inversa e revisão espaçada por FSRS, com alternativas escolhidas entre as bandeiras mais fáceis de confundir com a correta. O domínio exige as duas direções, acertos em dias distintos e estabilidade de pelo menos 30 dias.

O progresso fica no IndexedDB do navegador. Não há conta, backend, tracking ou sincronização automática. A tela de ajustes permite exportar e restaurar um backup JSON versionado.

## Desenvolvimento

Requisitos: Node.js 20 ou mais recente e pnpm.

```bash
pnpm install
pnpm dev
```

Validações:

```bash
pnpm data:validate
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm test:e2e
```

## Hospedagem

O deploy no Fly.io foi desativado.

## Catálogo e licenças

ONU e FIFA definem a elegibilidade. Wikidata é usado para localizar os arquivos e o Wikimedia Commons fornece as imagens e metadados de licença. Os arquivos são fixados em `public/flags`; o app não faz hotlink em runtime. `src/data/catalog.json` e `src/data/credits.json` são artefatos versionados gerados pelo pipeline.

Para conferir mudanças nas fontes e reconstruir os artefatos:

```bash
pnpm data:refresh
pnpm data:validate
```

O refresh nunca publica mudanças por conta própria. Overrides editoriais registram casos como Taiwan/Chinese Taipei, Irlanda do Norte, Vaticano/Santa Sé e o anverso do Paraguai.
