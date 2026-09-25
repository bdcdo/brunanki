import { expect, test, type Page } from "@playwright/test";

import {
  expectNoHorizontalOverflow,
  expectNoSeriousAccessibilityViolations
} from "./helpers";
import {
  americasEntities,
  americasIntroduction,
  catalogEntities
} from "./seed";

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

test("home diz o que fazer agora e mostra o álbum do continente", async ({
  page
}) => {
  const americas = americasEntities.length;
  await expect(
    page.getByRole("heading", { name: "Álbum das Américas" })
  ).toBeVisible();
  await expect(page.getByText(`de ${americas} coladas`)).toBeVisible();
  await expect(
    page.getByRole("img", {
      name: `0 coladas, 0 em andamento, ${americas} vazias`
    })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Sua primeira bandeira está pronta" })
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /Estudar agora/ })).toBeVisible();

  await expectNoHorizontalOverflow(page);
  await expectNoSeriousAccessibilityViolations(page);
});

test("navegação principal funciona em desktop e mobile", async ({ page }) => {
  // A mesma <nav> serve às duas larguras: abas no cabeçalho do desktop e
  // barra fixa no rodapé do celular. Não há menu a abrir em nenhuma delas.
  const navigation = page.getByRole("navigation", {
    name: "Navegação principal"
  });
  await expect(navigation).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Hoje" })).toHaveAttribute(
    "aria-current",
    "page"
  );

  // Escopo na navegação: a home tem outros textos com "Álbum", e o seletor
  // solto violaria o modo estrito do Playwright.
  await navigation.getByRole("link", { name: "Álbum" }).click();
  await expect(page).toHaveURL(/\/catalogo$/);
  await expect(page.getByRole("heading", { name: "Álbum" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Álbum" })).toHaveAttribute(
    "aria-current",
    "page"
  );
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

test("puxar uma bandeira do álbum faz dela a próxima novidade", async ({
  page
}) => {
  // Dominica é a última da ordem sugerida; puxada pelo detalhe, ela passa na
  // frente das outras 34.
  await page.goto("/catalogo/dma");
  await page.getByRole("link", { name: "Estudar esta bandeira agora" }).click();
  await page.getByRole("button", { name: /Começar sessão/ }).click();
  await expect(
    page.getByRole("heading", { name: "Esta é a bandeira de Dominica." })
  ).toBeVisible();
});

test("perfil zerado entra direto em /estudar pela primeira bandeira das Américas", async ({
  page
}) => {
  // Não há diagnóstico nem trava: o estudo abre sem nenhum estado semeado, e
  // a primeira novidade é do continente ativo, e não do catálogo inteiro.
  await page.goto("/estudar");
  await page.getByRole("button", { name: /Começar sessão/ }).click();
  await expect(
    page.getByRole("heading", {
      name: `Esta é a bandeira de ${americasIntroduction[0]!.displayNamePtBr}.`
    })
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

test("a barra inferior do celular não esconde o fim do conteúdo", async ({
  page,
  isMobile
}) => {
  test.skip(!isMobile, "A barra inferior só existe abaixo de 761px.");

  // A barra é `fixed`, então ela cobre o que estiver por baixo dela. O que
  // garante que o último botão da página continue alcançável é o respiro no
  // fim do <main>, e ele precisa ser pelo menos a altura da barra.
  const navigation = page.getByRole("navigation", {
    name: "Navegação principal"
  });
  await expect(navigation).toBeVisible();
  const navHeight = await navigation.evaluate(
    (element) => element.getBoundingClientRect().height
  );
  const mainPadding = await page
    .locator("main#main")
    .evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).paddingBottom)
    );
  expect(mainPadding).toBeGreaterThanOrEqual(navHeight);

  // Os quatro destinos têm alvo de toque de pelo menos 44px.
  for (const link of await navigation.getByRole("link").all()) {
    const box = await link.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
  }

  await expectNoSeriousAccessibilityViolations(page);
});
