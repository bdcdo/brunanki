# Ptanki

Ptanki é um webapp em pt-BR para aprender e revisar as bandeiras dos Estados reconhecidos pela ONU. O catálogo reúne os 193 Estados-membros mais os dois observadores permanentes — a Santa Sé e a Palestina —, totalizando 195 entidades de aprendizagem.

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

O app roda no [Fly.io](https://fly.io) na região `gru`, como imagem Docker do build standalone do Next.js. A configuração fica em `fly.toml` e `Dockerfile`.

A máquina opera sob demanda: `min_machines_running = 0` com `auto_stop_machines = "suspend"` faz o Fly suspendê-la quando não há tráfego e retomá-la na requisição seguinte, restaurando um snapshot de memória em vez de dar boot completo. Parada, a máquina custa apenas o armazenamento do sistema de arquivos raiz.

```bash
fly deploy --ha=false   # --ha=false mantém uma única máquina
fly status
fly logs
```

Os cabeçalhos de cache e de segurança são definidos em `headers()` no `next.config.ts`.

## Catálogo e licenças

A ONU define a elegibilidade, e a regra vive em `scripts/catalog-rules.ts` — o mesmo módulo que o gerador aplica, o validador cobra e os testes exercitam contra o artefato commitado. Wikidata é usado para localizar os arquivos e o Wikimedia Commons fornece as imagens e metadados de licença. Os arquivos são fixados em `public/flags`; o app não faz hotlink em runtime. `src/data/catalog.json` e `src/data/runtime-catalog.json` são artefatos versionados gerados pelo pipeline.

Para conferir mudanças nas fontes e reconstruir os artefatos:

```bash
pnpm data:refresh
pnpm data:validate
```

O refresh nunca publica mudanças por conta própria. Overrides editoriais registram casos como Taiwan/Chinese Taipei, Irlanda do Norte, Vaticano/Santa Sé e o anverso do Paraguai.
