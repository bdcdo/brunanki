import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import catalogJson from "../src/data/catalog.json";
import type { Catalog } from "../src/types/catalog";

/**
 * Gera `ATRIBUICOES.md` a partir do catálogo.
 *
 * A procedência das imagens saiu do site quando a página `/creditos` foi
 * removida, mas ela não podia virar um markdown escrito à mão: o catálogo é
 * regerado por `pnpm data:refresh`, e uma lista colada desatualizaria em
 * silêncio na primeira reconferência de licenças. Aqui o documento é derivado,
 * e `pnpm data:validate` recusa um artefato fora de sincronia — a mesma
 * técnica que `runtime-catalog.test.ts` usa para o catálogo de runtime.
 *
 * A atribuição legalmente exigida continua no produto, não só aqui: a página
 * de detalhe de cada bandeira exibe licença e link para o Commons.
 */

export const ATTRIBUTION_PATH = join(process.cwd(), "ATRIBUICOES.md");

const UN_MEMBERS_URL = "https://www.un.org/en/about-us/member-states";
const UN_OBSERVERS_URL = "https://www.un.org/en/about-us/non-member-states";
const MATH_ACADEMY_WAY_URL =
  "https://www.justinmath.com/files/the-math-academy-way.pdf";
const MATH_ACADEMY_PEDAGOGY_URL = "https://mathacademy.com/pedagogy";

/** Escapa o que quebraria uma célula de tabela Markdown. */
function cell(value: string): string {
  return value.replaceAll("|", "\\|");
}

export function buildAttributionMarkdown(catalog: Catalog): string {
  const flagByEntityId = new Map(
    catalog.flagRevisions.map((flag) => [flag.entityId, flag])
  );

  const rows = catalog.entities.map((entity) => {
    const flag = flagByEntityId.get(entity.id);
    if (!flag) {
      throw new Error(`Entidade sem bandeira no catálogo: ${entity.id}`);
    }
    const license = flag.license.url
      ? `[${cell(flag.license.shortName)}](${flag.license.url})`
      : cell(flag.license.shortName);
    const file = `[${cell(flag.commons.fileTitle.replace("File:", ""))}](${flag.commons.descriptionUrl})`;
    return `| ${cell(entity.displayNamePtBr)} | ${file} | ${license} |`;
  });

  const requiringAttribution = catalog.flagRevisions
    .filter(({ license }) => license.attributionRequired)
    .map((flag) => {
      const entity = catalog.entities.find(({ id }) => id === flag.entityId);
      const name = entity?.displayNamePtBr ?? flag.entityId;
      // O crédito é reproduzido como o Commons o declara, inclusive quando ele
      // remete ao histórico do arquivo — quem precisa da autoria segue o link
      // da tabela abaixo. Reescrever seria inventar procedência.
      const artist = flag.license.artist
        ? ` Crédito declarado no Commons: ${flag.license.artist}`
        : "";
      return `- **${name}** (\`${flag.filePath}\`) — ${flag.license.shortName}${flag.license.url ? `, ${flag.license.url}` : ""}.${artist}`;
    });

  const observers = catalog.entities.filter(({ memberships }) =>
    memberships.some(({ status }) => status === "observer")
  );
  const members = catalog.entities.length - observers.length;

  return `# Atribuição das bandeiras

<!-- Arquivo gerado por \`scripts/build-attribution.ts\` a partir de \`src/data/catalog.json\`. Não editar à mão: \`pnpm data:validate\` recusa uma versão fora de sincronia. -->

Este documento registra a procedência e a licença de cada imagem do catálogo. Ele substitui a página \`/creditos\`, removida do site — a atribuição que a licença de fato exige continua visível no produto, na página de detalhe de cada bandeira, que mostra a licença e o link para o Wikimedia Commons.

Catálogo em \`${catalog.version}\`, fontes reconferidas em \`${catalog.verifiedAt}\`.

## Quem entra no catálogo

São ${catalog.entities.length} entidades: os ${members} Estados-membros da ONU mais ${observers.length} Estados observadores permanentes não membros — ${observers.map(({ displayNamePtBr }) => displayNamePtBr).join(" e ")}. A regra de pertencimento vive em \`scripts/catalog-rules.ts\`, e é a mesma que o gerador aplica, o validador cobra e os testes exercitam contra o artefato commitado.

- Estados-membros: <${UN_MEMBERS_URL}>
- Estados observadores: <${UN_OBSERVERS_URL}>

## De onde vêm as imagens

O Wikidata é usado para localizar o arquivo de bandeira de cada entidade (propriedade P41), e o Wikimedia Commons fornece as imagens e os metadados de licença. Os arquivos são fixados em \`public/flags\` e conferidos por SHA-1 a cada validação; o app não faz hotlink em runtime.

Bandeiras podem estar em domínio público e ainda assim sujeitas a regras locais de uso de símbolos nacionais. Domínio público diz respeito ao direito autoral sobre a imagem, não ao uso do símbolo.

## Bandeiras que exigem atribuição

${requiringAttribution.length > 0 ? requiringAttribution.join("\n") : "Nenhuma: todas as imagens estão em domínio público ou sob CC0."}

## Método de aprendizagem

A progressão adapta ao domínio de fatos os princípios de recuperação ativa, feedback imediato, prática intercalada e revisão espaçada apresentados pelo Math Academy. Bandeiras são itens em grande parte independentes, e por isso o app não presume um grafo de pré-requisitos geográficos.

- The Math Academy Way: <${MATH_ACADEMY_WAY_URL}>
- Pedagogia do Math Academy: <${MATH_ACADEMY_PEDAGOGY_URL}>

## Todas as ${catalog.entities.length} imagens

| Entidade | Arquivo no Commons | Licença |
| --- | --- | --- |
${rows.join("\n")}
`;
}

async function main(): Promise<void> {
  const markdown = buildAttributionMarkdown(catalogJson as Catalog);
  await writeFile(ATTRIBUTION_PATH, markdown);
  console.log(
    `ATRIBUICOES.md gerado com ${(catalogJson as Catalog).entities.length} bandeiras.`
  );
}

if (process.argv[1]?.endsWith("build-attribution.ts")) {
  void main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
