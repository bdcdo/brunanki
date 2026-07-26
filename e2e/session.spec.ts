import { expect, test, type Page } from "@playwright/test";

import {
  expectNoHorizontalOverflow,
  expectNoSeriousAccessibilityViolations
} from "./helpers";
import { catalogEntities, seedCompletedDiagnostic } from "./seed";

/**
 * A sessão de estudo, com estado semeado.
 *
 * Spec próprio, e não um acréscimo a `ptanki.spec.ts`: lá um `beforeEach` de
 * escopo de arquivo navega para a home antes de cada teste, e a semeadura
 * precisa controlar a navegação. Sem estes testes, os exercícios ativos e
 * `/progresso` ficam fora do gate de axe e do de overflow — que é onde está
 * quase todo o CSS novo da migração visual.
 */

/** A fila de itens novos segue a ordem do catálogo, então a primeira questão
 *  de uma sessão sem estado é sempre esta entidade. */
const firstNew = catalogEntities[0];
const brazil = catalogEntities.find(({ id }) => id === "bra")!;

/** `buildDailyQueue` recebe `baseNewLimit: 5`, e sem nenhuma tentativa recente
 *  o limite não é reduzido: cinco itens novos, um por entidade. */
const NEW_ITEMS = 5;

function sessionProgress(page: Page) {
  return page.getByRole("progressbar", { name: "Sessão de hoje" });
}

test("a sessão atravessa apresentação, alternativas e digitação", async ({
  page
}) => {
  await seedCompletedDiagnostic(page);
  await page.goto("/estudar");
  await page.getByRole("button", { name: /Começar sessão/ }).click();

  await expect(sessionProgress(page)).toHaveAttribute(
    "aria-valuemax",
    String(NEW_ITEMS)
  );

  await expect(
    page.getByRole("heading", {
      name: `Esta é a bandeira de ${firstNew.displayNamePtBr}.`
    })
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectNoSeriousAccessibilityViolations(page);

  await page.getByRole("button", { name: /Praticar/ }).click();
  await expect(
    page.getByRole("heading", { name: "De onde é esta bandeira?" })
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectNoSeriousAccessibilityViolations(page);

  await page
    .getByRole("button", { name: firstNew.displayNamePtBr, exact: true })
    .click();
  await expect(page.getByText("Acerto de primeira")).toBeVisible();

  await page
    .getByRole("button", { name: /Agora, lembre sem alternativas/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "Digite o nome desta entidade." })
  ).toBeVisible();

  await page
    .getByRole("textbox", { name: "Nome da entidade" })
    .fill(firstNew.displayNamePtBr);
  await page.getByRole("button", { name: /Responder/ }).click();

  await expect(page.getByText("Acerto de primeira")).toBeVisible();
  // Um acerto não agenda repetição imediata, então a fila não cresce.
  await expect(sessionProgress(page)).toHaveAttribute(
    "aria-valuemax",
    String(NEW_ITEMS)
  );

  await expectNoHorizontalOverflow(page);
  await expectNoSeriousAccessibilityViolations(page);
});

test("o exercício inverso registra o erro e agenda a repetição imediata", async ({
  page
}) => {
  await seedCompletedDiagnostic(page, {
    dueStates: [
      {
        entityId: brazil.id,
        skill: "nameToFlagRecognition",
        dueAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
      }
    ]
  });
  await page.goto("/estudar");
  await page.getByRole("button", { name: /Começar sessão/ }).click();

  // O item vencido vem antes dos novos, e uma habilidade de reconhecimento
  // abre direto no exercício inverso, sem passo de apresentação.
  await expect(
    page.getByRole("heading", {
      name: `Qual é a bandeira de ${brazil.displayNamePtBr}?`
    })
  ).toBeVisible();
  await expect(sessionProgress(page)).toHaveAttribute(
    "aria-valuemax",
    String(NEW_ITEMS + 1)
  );
  await expectNoHorizontalOverflow(page);
  await expectNoSeriousAccessibilityViolations(page);

  // A alternativa certa é identificada pelo arquivo da bandeira, e não pela
  // posição: a ordem é embaralhada por uma semente sorteada a cada sessão.
  await page
    .getByRole("button", { name: /^Opção \d+: bandeira com / })
    .filter({ hasNot: page.locator(`img[src="${brazil.flagPath}"]`) })
    .first()
    .click();

  await expect(page.getByText("Vamos corrigir")).toBeVisible();
  await expect(page.getByText(brazil.displayNamePtBr)).toBeVisible();

  // O erro insere o item de novo, quatro posições à frente: o denominador da
  // sessão cresce no meio dela. É o comportamento que qualquer indicador de
  // progresso desta tela precisa acomodar.
  await expect(sessionProgress(page)).toHaveAttribute(
    "aria-valuemax",
    String(NEW_ITEMS + 2)
  );

  await expectNoHorizontalOverflow(page);
  await expectNoSeriousAccessibilityViolations(page);
});

test("progresso resume o estado guardado sem overflow", async ({ page }) => {
  await seedCompletedDiagnostic(page, {
    dueStates: [
      {
        entityId: brazil.id,
        skill: "nameToFlagRecognition",
        dueAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
      }
    ]
  });
  await page.goto("/progresso");

  await expect(page.getByRole("heading", { name: "Progresso" })).toBeVisible();
  await expect(
    page.getByRole("progressbar", { name: "Entidades dominadas" })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "0 tentativas" })
  ).toBeVisible();

  await expectNoHorizontalOverflow(page);
  await expectNoSeriousAccessibilityViolations(page);
});
