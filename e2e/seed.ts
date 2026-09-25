import { expect, type Page } from "@playwright/test";

import runtimeCatalog from "../src/data/runtime-catalog.json";
import { introductionOrder } from "../src/data/curriculum";

/**
 * Semeadura de progresso para o e2e.
 *
 * O estado do app vive só no IndexedDB, e reimplementar o schema do Dexie aqui
 * criaria uma segunda definição do formato que envelheceria em separado da de
 * `src/storage/`. Em vez disso a semeadura entra pela porta que o usuário já
 * usa: monta um backup no formato canônico e o importa em `/configuracoes`.
 * O ganho colateral é que o próprio fluxo de restauração fica exercitado a
 * cada teste que semeia.
 */

type Skill = "flagToNameRecall" | "nameToFlagRecognition";

/**
 * Uma habilidade agendada cujo cartão já venceu — portanto um item `due`, que
 * `nextActivity` põe na frente dos itens novos.
 */
export interface DueSkillState {
  entityId: string;
  skill: Skill;
  dueAt: Date;
  /** Padrão 3,2 dias, longe do domínio; 30 ou mais, com dois dias de
   *  sucesso, semeia uma habilidade que conta para dominar a bandeira. */
  stability?: number;
  successDays?: readonly string[];
}

export interface SeedOptions {
  dueStates?: readonly DueSkillState[];
}

/** Entidades na ordem do catálogo; a ordem em que a sessão
 *  escolhe os itens novos — o que torna a primeira questão previsível. */
export const catalogEntities = runtimeCatalog.entities;

/** As novidades vêm só do continente ativo, e o padrão são as Américas. */
export const americasEntities = catalogEntities.filter(
  ({ continent }) => continent === "americas"
);

/** A ordem em que a sessão introduz as Américas: a do currículo, lida da
 *  mesma fonte que o app usa, para que a primeira questão seja previsível. */
export const americasIntroduction = introductionOrder("americas").map((id) =>
  catalogEntities.find((entity) => entity.id === id)!
);

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function buildBackup({ dueStates = [] }: SeedOptions) {
  const now = new Date();
  const lastReview = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

  return {
    format: "brunanki-export",
    schemaVersion: 3,
    // Derivada do catálogo, e não fixada: se o conjunto de entidades mudar de
    // tamanho, a semeadura acompanha em vez de quebrar.
    catalogVersion: runtimeCatalog.version,
    exportedAt: now.toISOString(),
    settings: {
      desiredRetention: 0.9,
      timeZone: "America/Sao_Paulo",
      activeContinent: "americas"
    },
    skillStates: dueStates.map(
      ({ entityId, skill, dueAt, stability = 3.2, successDays }) => ({
        // O schema exige esta composição exata; um id livre é rejeitado com
        // "ID do estado não corresponde à entidade e habilidade".
        id: `${entityId}::${skill}`,
        entityId,
        skill,
        phase: "scheduled",
        card: {
          due: dueAt.toISOString(),
          stability,
          difficulty: 5.1,
          elapsed_days: 5,
          scheduled_days: 3,
          learning_steps: 0,
          reps: 2,
          lapses: 0,
          state: 2,
          last_review: lastReview.toISOString()
        },
        distinctSuccessDays: successDays
          ? [...successDays]
          : [isoDay(lastReview)],
        // "correct" de propósito: com outro desfecho o estado entraria também
        // como correção, e a composição da fila deixaria de ser previsível.
        lastOutcome: "correct",
        updatedAt: lastReview.toISOString()
      })
    ),
    attempts: [],
    pairStates: []
  };
}

/**
 * Deixa o navegador com os estados pedidos.
 *
 * A ordem observável importa: a importação primeiro baixa um backup de
 * segurança do estado atual e só então pergunta a confirmação. Sem consumir o
 * download e sem tratar o diálogo, o Playwright dispensa a confirmação por
 * padrão e a importação devolve `false` — em silêncio, porque a tela apenas
 * informa que a restauração foi cancelada.
 */
export async function seedProgress(
  page: Page,
  options: SeedOptions = {}
): Promise<void> {
  await page.goto("/configuracoes");

  page.once("dialog", (dialog) => dialog.accept());
  const safetyBackup = page.waitForEvent("download");

  await page.locator('input[type="file"]').setInputFiles({
    name: "brunanki-seed.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(buildBackup(options)))
  });

  await safetyBackup;
  await expect(page.getByRole("status")).toHaveText(
    "Backup restaurado. O estado anterior também foi baixado."
  );
}
