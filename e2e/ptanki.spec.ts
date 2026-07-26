import { expect, test, type Page } from "@playwright/test";

import {
  expectNoHorizontalOverflow,
  expectNoSeriousAccessibilityViolations
} from "./helpers";

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
  await expect(page.getByText("220 bandeiras · um plano só seu")).toBeVisible();
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

  await expect(page.getByText("220 resultados")).toBeVisible();
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
  await expect(page.getByText("Bandeira 1 de 220")).toBeVisible();
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
  await expect(page.getByText("Bandeira 2 de 220")).toBeVisible();
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
    /^ptanki-backup-\d{4}-\d{2}-\d{2}\.json$/
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

test("créditos informam fontes, método e as 220 imagens", async ({ page }) => {
  await page.goto("/creditos");

  await expect(
    page.getByRole("heading", { name: "Fontes e créditos" })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Fontes institucionais" })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Método de aprendizagem" })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Arquivos de bandeira" })
  ).toBeVisible();
  await expect(page.getByText("220 imagens")).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Membros da ONU/ })
  ).toHaveAttribute("href", "https://www.un.org/en/about-us/member-states");
  await expect(
    page.getByRole("link", { name: /The Math Academy Way/ })
  ).toHaveAttribute(
    "href",
    "https://www.justinmath.com/files/the-math-academy-way.pdf"
  );

  await expectNoHorizontalOverflow(page);
  await expectNoSeriousAccessibilityViolations(page);
});
