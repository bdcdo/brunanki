import { expect, test, type Page } from "@playwright/test";

import {
  expectNoHorizontalOverflow,
  expectNoSeriousAccessibilityViolations
} from "./helpers";
import { catalogEntities } from "./seed";

/** O tamanho do catálogo aparece em seis asserções, e fixá-lo faria toda
 *  mudança no conjunto de entidades quebrar testes que nada têm a ver com
 *  ela. Vem da mesma fonte que a UI lê. */
const ENTITY_COUNT = catalogEntities.length;

async function openFreshApp(page: Page) {
  await page.goto("/");
}

test.beforeEach(async ({ page }) => {
  await openFreshApp(page);
});

test("home apresenta a proposta e a entrada do diagnóstico sem overflow", async ({
  page
}) => {
  await expect(
    page.getByRole("heading", { name: "Reconheça o mundo inteiro." })
  ).toBeVisible();
  await expect(
    page.getByText(`${ENTITY_COUNT} bandeiras · um plano só seu`)
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Começar diagnóstico/ })
  ).toBeVisible();
  await expect(page.getByText("Conta necessária").locator("..")).toContainText(
    "Não"
  );

  await expectNoHorizontalOverflow(page);
  await expectNoSeriousAccessibilityViolations(page);
});

test("navegação principal funciona em desktop e mobile", async ({
  page,
  isMobile
}) => {
  if (isMobile) {
    await page.getByRole("button", { name: "Abrir menu" }).click();
    await expect(
      page.getByRole("navigation", { name: "Navegação principal" })
    ).toBeVisible();
  }

  // Escopo no menu: "Bandeiras" também casa com "Explorar bandeiras", do hero
  // da home, e o seletor solto viola o modo estrito do Playwright.
  await page
    .getByRole("navigation", { name: "Navegação principal" })
    .getByRole("link", { name: "Bandeiras" })
    .click();
  await expect(page).toHaveURL(/\/catalogo$/);
  await expect(page.getByRole("heading", { name: "Bandeiras" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("catálogo filtra nomes, abre detalhes e mantém bandeiras inteiras", async ({
  page
}) => {
  await page.goto("/catalogo");

  await expect(page.getByText(`${ENTITY_COUNT} resultados`)).toBeVisible();
  await page.getByRole("searchbox", { name: "Buscar por nome" }).fill("Brasil");
  await expect(page.getByText("1 resultado")).toBeVisible();

  const brazilCard = page.getByRole("link", { name: /Bandeira de Brasil/ });
  await expect(brazilCard).toBeVisible();

  const image = brazilCard.getByRole("img", { name: "Bandeira de Brasil" });
  await expect(image).toHaveJSProperty("complete", true);
  const imageGeometry = await image.evaluate((element) => {
    const imageElement = element as HTMLImageElement;
    const imageRect = imageElement.getBoundingClientRect();
    const frameRect = imageElement.parentElement!.getBoundingClientRect();
    return {
      imageHeight: imageRect.height,
      imageWidth: imageRect.width,
      naturalHeight: imageElement.naturalHeight,
      naturalWidth: imageElement.naturalWidth,
      withinFrame:
        imageRect.left >= frameRect.left &&
        imageRect.right <= frameRect.right &&
        imageRect.top >= frameRect.top &&
        imageRect.bottom <= frameRect.bottom
    };
  });
  expect(imageGeometry.naturalWidth).toBeGreaterThan(0);
  expect(imageGeometry.naturalHeight).toBeGreaterThan(0);
  expect(imageGeometry.imageWidth).toBeGreaterThan(0);
  expect(imageGeometry.imageHeight).toBeGreaterThan(0);
  expect(imageGeometry.withinFrame).toBe(true);

  await brazilCard.click();
  await expect(page).toHaveURL(/\/catalogo\/bra$/);
  await expect(page.getByRole("heading", { name: "Brasil" })).toBeVisible();

  await expectNoHorizontalOverflow(page);
  await expectNoSeriousAccessibilityViolations(page);
});

test("diagnóstico registra feedback e persiste o avanço após reload", async ({
  page
}) => {
  await page.goto("/diagnostico");
  await page.getByRole("button", { name: /Começar diagnóstico/ }).click();

  await expect(
    page.getByRole("heading", { name: "De onde é esta bandeira?" })
  ).toBeVisible();
  await expect(page.getByText(`Bandeira 1 de ${ENTITY_COUNT}`)).toBeVisible();
  // A bandeira do diagnóstico é descrita pelas cores, e não com um texto
  // genérico igual para todas: descreve sem entregar a resposta.
  await expect(page.getByRole("img", { name: /^Bandeira com / })).toBeVisible();

  await page
    .getByRole("textbox", { name: "Nome da entidade" })
    .fill("resposta deliberadamente incorreta");
  await page.getByRole("button", { name: /Responder/ }).click();

  await expect(page.getByText("Resposta", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Você escreveu: resposta deliberadamente incorreta")
  ).toBeVisible();
  await expect(
    page.getByText("Esta bandeira entrará na etapa de aprendizagem.")
  ).toBeVisible();
  await expect(page.getByRole("img", { name: /^Bandeira de / })).toBeVisible();

  await page.reload();
  await expect(page.getByText(`Bandeira 2 de ${ENTITY_COUNT}`)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "De onde é esta bandeira?" })
  ).toBeVisible();

  await expectNoHorizontalOverflow(page);
  await expectNoSeriousAccessibilityViolations(page);
});

test("sessão de estudo permanece bloqueada antes do diagnóstico completo", async ({
  page
}) => {
  await page.goto("/estudar");

  await expect(
    page.getByRole("heading", {
      name: "Faça o diagnóstico antes de estudar."
    })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Ir ao diagnóstico/ })
  ).toBeVisible();

  await expectNoHorizontalOverflow(page);
  await expectNoSeriousAccessibilityViolations(page);
});

test("ajustes expõem backup, restauração e reset com status acessível", async ({
  page
}) => {
  await page.goto("/configuracoes");

  await expect(page.getByRole("heading", { name: "Ajustes" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Baixar backup/ })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Escolher arquivo/ })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Apagar progresso/ })
  ).toBeVisible();
  await expect(page.getByRole("status")).toBeAttached();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /Baixar backup/ }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(
    /^brunanki-backup-\d{4}-\d{2}-\d{2}\.json$/
  );
  await expect(page.getByRole("status")).toHaveText("Backup baixado.");

  await expectNoHorizontalOverflow(page);
  await expectNoSeriousAccessibilityViolations(page);
});

test("cancelar restauração não informa que o backup foi aplicado", async ({
  page
}) => {
  await page.goto("/configuracoes");

  const exportPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /Baixar backup/ }).click();
  const exportedBackup = await exportPromise;
  const backupPath = await exportedBackup.path();
  expect(backupPath).not.toBeNull();

  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toBe(
      "Substituir todo o progresso atual pelos dados deste backup?"
    );
    await dialog.dismiss();
  });
  const safetyBackupPromise = page.waitForEvent("download");
  await page.locator('input[type="file"]').setInputFiles(backupPath!);
  await safetyBackupPromise;

  await expect(page.getByRole("status")).toHaveText(
    "Restauração cancelada. O progresso atual foi mantido."
  );
});

test("a página de detalhe atribui a licença de cada bandeira", async ({
  page
}) => {
  // Substitui o teste da página `/creditos`, removida. A atribuição que a
  // licença exige passa a viver só aqui no produto — Omã é a única bandeira do
  // catálogo com `attributionRequired`, então é dela que a obrigação depende.
  await page.goto("/catalogo/omn");

  await expect(page.getByRole("heading", { name: "Omã" })).toBeVisible();
  await expect(page.getByText("OGL-om 1.0")).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Ver no Wikimedia Commons/ })
  ).toHaveAttribute("href", /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);

  await expectNoHorizontalOverflow(page);
  await expectNoSeriousAccessibilityViolations(page);
});

test("a gaveta devolve o foco e não deixa links alcançáveis quando fechada", async ({
  page,
  isMobile
}) => {
  test.skip(!isMobile, "A gaveta só existe abaixo de 761px.");

  // Fechada, os cinco links continuavam na ordem de tabulação, fora da tela:
  // quem navega por teclado percorria um menu invisível antes do conteúdo.
  const hidden = await page
    .getByRole("navigation", { name: "Navegação principal" })
    .isVisible();
  expect(hidden).toBe(false);

  const toggle = page.getByRole("button", { name: "Abrir menu" });
  await toggle.click();
  await expect(
    page.getByRole("navigation", { name: "Navegação principal" })
  ).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("navigation", { name: "Navegação principal" })
  ).toBeHidden();
  // O foco volta para quem abriu; sem isto ele ficaria num elemento que
  // acabou de sair da tela.
  await expect(page.getByRole("button", { name: "Abrir menu" })).toBeFocused();

  await expectNoSeriousAccessibilityViolations(page);
});
