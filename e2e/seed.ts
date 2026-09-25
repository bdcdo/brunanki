import { expect, type Page } from "@playwright/test";

import runtimeCatalog from "../src/data/runtime-catalog.json";

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
 * `buildDailyQueue` coloca no início da fila, antes dos itens novos.
 */
export interface DueSkillState {
  entityId: string;
  skill: Skill;
  dueAt: Date;
}

export interface SeedOptions {
  dueStates?: readonly DueSkillState[];
}

const ENTITY_IDS = runtimeCatalog.entities.map(({ id }) => id);

/** Entidades na ordem do catálogo, que é a ordem em que `buildDailyQueue`
 *  escolhe os itens novos — o que torna a primeira questão previsível. */
export const catalogEntities = runtimeCatalog.entities;

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function buildBackup({ dueStates = [] }: SeedOptions) {
  const now = new Date();
  const lastReview = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

  return {
    format: "ptanki-export",
    schemaVersion: 2,
    // Derivada do catálogo, e não fixada: se o conjunto de entidades mudar de
    // tamanho, a semeadura acompanha em vez de quebrar.
    catalogVersion: runtimeCatalog.version,
    exportedAt: now.toISOString(),
    settings: { desiredRetention: 0.9, timeZone: "America/Sao_Paulo" },
    skillStates: dueStates.map(({ entityId, skill, dueAt }) => ({
      // O schema exige esta composição exata; um id livre é rejeitado com
      // "ID do estado não corresponde à entidade e habilidade".
      id: `${entityId}::${skill}`,
      entityId,
      skill,
      phase: "scheduled",
      card: {
        due: dueAt.toISOString(),
        stability: 3.2,
        difficulty: 5.1,
        elapsed_days: 5,
        scheduled_days: 3,
        learning_steps: 0,
        reps: 2,
        lapses: 0,
        state: 2,
        last_review: lastReview.toISOString()
      },
      distinctSuccessDays: [isoDay(lastReview)],
      // "correct" de propósito: com outro desfecho o estado entraria também
      // como correção, e a composição da fila deixaria de ser previsível.
      lastOutcome: "correct",
      updatedAt: lastReview.toISOString()
    })),
    // Vazio porque `recentAccuracy` (domain/daily-queue.ts) mede as tentativas
    // recentes e reduz o limite de itens novos quando o acerto cai: seria uma
    // segunda variável mexendo no tamanho da fila.
    attempts: [],
    diagnosticState: {
      entityOrder: ENTITY_IDS,
      // `completedAt` é a única coisa que libera /estudar, mas o schema o
      // recusa quando o índice não alcançou o fim da ordem. Os dois campos
      // precisam concordar.
      currentIndex: ENTITY_IDS.length,
      startedAt: lastReview.toISOString(),
      completedAt: now.toISOString()
    }
  };
}

/**
 * Deixa o navegador com um diagnóstico concluído e os estados pedidos.
 *
 * A ordem observável importa: a importação primeiro baixa um backup de
 * segurança do estado atual e só então pergunta a confirmação. Sem consumir o
 * download e sem tratar o diálogo, o Playwright dispensa a confirmação por
 * padrão e a importação devolve `false` — em silêncio, porque a tela apenas
 * informa que a restauração foi cancelada.
 */
export async function seedCompletedDiagnostic(
  page: Page,
  options: SeedOptions = {}
): Promise<void> {
  await page.goto("/configuracoes");

  page.once("dialog", (dialog) => dialog.accept());
  const safetyBackup = page.waitForEvent("download");

  await page.locator('input[type="file"]').setInputFiles({
    name: "ptanki-seed.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(buildBackup(options)))
  });

  await safetyBackup;
  await expect(page.getByRole("status")).toHaveText(
    "Backup restaurado. O estado anterior também foi baixado."
  );
}
