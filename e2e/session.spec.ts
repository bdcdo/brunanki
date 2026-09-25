import { expect, test, type Page } from "@playwright/test";

import {
  expectNoHorizontalOverflow,
  expectNoSeriousAccessibilityViolations
} from "./helpers";
import { americasIntroduction, catalogEntities, seedProgress } from "./seed";

/**
 * A sessão de estudo, com estado semeado.
 *
 * Spec próprio, e não um acréscimo a `brunanki.spec.ts`: lá um `beforeEach` de
 * escopo de arquivo navega para a home antes de cada teste, e a semeadura
 * precisa controlar a navegação. Sem estes testes, os exercícios ativos e
 * `/progresso` ficam fora do gate de axe e do de overflow — que é onde está
 * quase todo o CSS novo da migração visual.
 */

/** A fila de itens novos segue a ordem do currículo do continente ativo,
 *  então a primeira questão de uma sessão sem estado é sempre esta. */
const firstNew = americasIntroduction[0]!;
const brazil = catalogEntities.find(({ id }) => id === "bra")!;

/** A linha que conta o que já foi respondido nesta sessão. A sessão não tem
 *  tamanho fixo, então é contagem, e não progresso de x em N. */
function sessionCount(page: Page, answered: number) {
  return page.getByText(
    answered === 1
      ? "1 respondida nesta sessão"
      : `${answered} respondidas nesta sessão`
  );
}

test("a sessão atravessa apresentação, alternativas e digitação", async ({
  page
}) => {
  await seedProgress(page);
  await page.goto("/estudar");
  await page.getByRole("button", { name: /Começar sessão/ }).click();

  await expect(sessionCount(page, 0)).toBeVisible();

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
  await expect(sessionCount(page, 2)).toBeVisible();

  // A fila é recalculada depois de cada resposta. O reconhecimento dos
  // Estados Unidos seria a mesma bandeira na tela seguinte, então ele espera,
  // e a próxima é a novidade seguinte da ordem.
  await page.getByRole("button", { name: /Continuar/ }).click();
  await expect(
    page.getByRole("heading", {
      name: `Esta é a bandeira de ${americasIntroduction[1]!.displayNamePtBr}.`
    })
  ).toBeVisible();

  await expectNoHorizontalOverflow(page);
  await expectNoSeriousAccessibilityViolations(page);

  // A sessão não tem fim marcado, e encerrar é o caminho para o resumo.
  await page.getByRole("button", { name: /Encerrar/ }).click();
  await expect(page.getByText("Sessão encerrada")).toBeVisible();
  await expect(page.getByText("de 2 na primeira tentativa")).toBeVisible();
  await expectNoSeriousAccessibilityViolations(page);
});

test("o exercício inverso registra o erro e traz a correção antes da novidade", async ({
  page
}) => {
  await seedProgress(page, {
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
  await expect(page.getByText("1 revisão vencida agora")).toBeVisible();
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
  // O veredito explica o erro pelo contrato de feedback: com par curado, o
  // traço das duas; sem ele, onde fica cada uma. Nenhuma das formas fala de
  // fila ou de quando a bandeira volta.
  const verdict = page.getByRole("status");
  // A explicação começa pela certa, o Brasil, que não tem par curado: ou as
  // duas estão na mesma sub-região, ou cada uma é dita com a sua. Com a certa
  // e a escolhida trocadas, a frase começaria pela escolhida.
  await expect(
    verdict.getByText(/^Brasil( e .* são da mesma sub-região|: América do Sul)/)
  ).toBeVisible();
  await expect(verdict).not.toContainText(/reaparec|revisão será|agend/i);
  // `exact`, porque o enunciado "Qual é a bandeira de Brasil?" continua na
  // tela durante o veredito — a grade não é mais desmontada — e o nome solto
  // casaria com os dois. A permanência é a mudança, não um efeito colateral.
  await expect(
    page.getByText(brazil.displayNamePtBr, { exact: true })
  ).toBeVisible();
  // A alternativa escolhida continua montada e marcada como erro, que é o que
  // liga o engano ao estímulo que o provocou.
  await expect(
    page.getByRole("button", { name: /^Opção \d+: bandeira com / }).first()
  ).toBeVisible();

  // O erro volta como correção antes de qualquer novidade: o FSRS o agenda
  // para daqui a um minuto, e a fila viva o traz na frente da bandeira nova
  // seguinte, mesmo sem outra revisão para intercalar.
  await page.getByRole("button", { name: /Continuar/ }).click();
  await expect(
    page.getByRole("heading", {
      name: `Qual é a bandeira de ${brazil.displayNamePtBr}?`
    })
  ).toBeVisible();
  await expect(sessionCount(page, 1)).toBeVisible();

  await expectNoHorizontalOverflow(page);
  await expectNoSeriousAccessibilityViolations(page);
});

test("progresso resume o estado guardado sem overflow", async ({ page }) => {
  await seedProgress(page, {
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

test("digitar o nome de outro país explica a diferença entre os dois", async ({
  page
}) => {
  await page.goto("/estudar");
  await page.getByRole("button", { name: /Começar sessão/ }).click();
  await page.getByRole("button", { name: /Praticar/ }).click();
  await page
    .getByRole("button", { name: firstNew.displayNamePtBr, exact: true })
    .click();
  await page
    .getByRole("button", { name: /Agora, lembre sem alternativas/ })
    .click();

  // Canadá é um país de verdade, então o resolvedor de nomes sabe qual
  // bandeira a pessoa tinha em mente, e o veredito compara as duas.
  await page.getByRole("textbox", { name: "Nome da entidade" }).fill("Canadá");
  await page.getByRole("button", { name: /Responder/ }).click();

  const verdict = page.getByRole("status");
  await expect(verdict).toContainText("Vamos corrigir");
  await expect(
    verdict.getByText(
      `${firstNew.displayNamePtBr} e Canadá são da mesma sub-região: América Setentrional, Américas.`
    )
  ).toBeVisible();
  await expectNoSeriousAccessibilityViolations(page);
});
