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

/** A alternativa certa na escolha da bandeira, pelo arquivo e não pela
 *  posição: a ordem é embaralhada por uma semente sorteada a cada sessão. */
function flagTile(page: Page, flagPath: string, correct = true) {
  const tiles = page.getByRole("button", { name: /^Opção \d+: bandeira com / });
  const img = page.locator(`img[src="${flagPath}"]`);
  return (
    correct ? tiles.filter({ has: img }) : tiles.filter({ hasNot: img })
  ).first();
}

const secondNew = americasIntroduction[1]!;

test("quem já conhece a bandeira acerta de primeira e pula o ensino", async ({
  page
}) => {
  await seedProgress(page);
  await page.goto("/estudar");
  await page.getByRole("button", { name: /Começar sessão/ }).click();

  await expect(sessionCount(page, 0)).toBeVisible();
  await expect(page.getByText("0 XP hoje, 0 no total")).toBeVisible();

  // A bandeira nova começa pela pergunta, e não pela apresentação.
  await expect(
    page.getByRole("heading", { name: "De onde é esta bandeira?" })
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Não sei/ })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectNoSeriousAccessibilityViolations(page);

  await page
    .getByRole("textbox", { name: "Nome da entidade" })
    .fill(firstNew.displayNamePtBr);
  await page.getByRole("button", { name: /Responder/ }).click();

  await expect(page.getByText("Acerto de primeira")).toBeVisible();
  await expect(page.getByText("1 XP hoje, 1 no total")).toBeVisible();
  // Digitar não é chute.
  await expect(page.getByRole("button", { name: "Foi chute" })).toHaveCount(0);

  // Sem ensino: a próxima tela já é a pergunta da novidade seguinte, e não a
  // apresentação dos Estados Unidos nem o reconhecimento da mesma bandeira.
  await page.getByRole("button", { name: /Continuar/ }).click();
  await expect(
    page.getByRole("heading", { name: "De onde é esta bandeira?" })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /^Esta é a bandeira/ })
  ).toHaveCount(0);
  await page
    .getByRole("textbox", { name: "Nome da entidade" })
    .fill(secondNew.displayNamePtBr);
  await page.getByRole("button", { name: /Responder/ }).click();
  await expect(page.getByText("2 XP hoje, 2 no total")).toBeVisible();

  // A sessão não tem fim marcado, e encerrar é o caminho para o resumo.
  await page.getByRole("button", { name: /Encerrar/ }).click();
  await expect(page.getByText("Sessão encerrada")).toBeVisible();
  await expect(page.getByText("de 2 na primeira tentativa")).toBeVisible();
  await expectNoSeriousAccessibilityViolations(page);

  // A tela Hoje soma as mesmas tentativas que a sessão acabou de gravar.
  await page.getByRole("link", { name: /Voltar para Hoje/ }).click();
  const xp = page.getByRole("region", { name: "Experiência" });
  await expect(xp.getByRole("definition")).toHaveText(["2", "2"]);
  await expect(xp.getByRole("term")).toHaveText(["XP hoje", "XP no total"]);
});

test("Não sei apresenta a bandeira e percorre o pacote até a escolha da bandeira", async ({
  page
}) => {
  await page.goto("/estudar");
  await page.getByRole("button", { name: /Começar sessão/ }).click();
  await page.getByRole("button", { name: /Não sei/ }).click();

  // Direto ao ensino, sem veredito de um erro que não houve.
  await expect(
    page.getByRole("heading", {
      name: `Esta é a bandeira de ${firstNew.displayNamePtBr}.`
    })
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectNoSeriousAccessibilityViolations(page);

  await page.getByRole("button", { name: /Praticar/ }).click();
  await page
    .getByRole("button", { name: firstNew.displayNamePtBr, exact: true })
    .click();
  // O nome acabou de ser mostrado: o acerto não é "de primeira" e não pontua.
  await expect(page.getByText("Acertou")).toBeVisible();
  await expect(page.getByRole("button", { name: "Foi chute" })).toHaveAttribute(
    "aria-pressed",
    "false"
  );
  await expectNoSeriousAccessibilityViolations(page);

  await page
    .getByRole("button", { name: /Agora, lembre sem alternativas/ })
    .click();
  await page
    .getByRole("textbox", { name: "Nome da entidade" })
    .fill(firstNew.displayNamePtBr);
  await page.getByRole("button", { name: /Responder/ }).click();
  await expect(page.getByText("Acertou")).toBeVisible();

  await page
    .getByRole("button", { name: /Agora, ache a bandeira pelo nome/ })
    .click();
  await expect(
    page.getByRole("heading", {
      name: `Qual é a bandeira de ${firstNew.displayNamePtBr}?`
    })
  ).toBeVisible();
  await flagTile(page, firstNew.flagPath).click();
  // Não sei, digitação e escolha da bandeira; a escolha do nome não conta.
  await expect(sessionCount(page, 3)).toBeVisible();
  await expect(page.getByText("0 XP hoje, 0 no total")).toBeVisible();

  // Só depois do quarto passo a fila retoma, com a novidade seguinte.
  await page.getByRole("button", { name: /Continuar/ }).click();
  await expect(
    page.getByRole("heading", { name: "De onde é esta bandeira?" })
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Não sei/ })).toBeVisible();
});

test("Foi chute tira o XP do acerto em escolha, e desmarcar o devolve", async ({
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
  await flagTile(page, brazil.flagPath).click();
  await expect(page.getByText("Acerto de primeira")).toBeVisible();
  await expect(page.getByText("1 XP hoje, 1 no total")).toBeVisible();

  const guess = page.getByRole("button", { name: "Foi chute" });
  await guess.click();
  await expect(guess).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("0 XP hoje, 0 no total")).toBeVisible();
  await expectNoSeriousAccessibilityViolations(page);

  await guess.click();
  await expect(guess).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByText("1 XP hoje, 1 no total")).toBeVisible();
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

  await flagTile(page, brazil.flagPath, false).click();

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
  // O erro no primeiro contato leva ao ensino.
  await expect(
    page.getByRole("button", { name: /Ver a bandeira com o nome/ })
  ).toBeVisible();
  await expectNoSeriousAccessibilityViolations(page);
});

test.describe("celular estreito", () => {
  // O Pixel 7 do projeto mobile tem 412 px, e a bandeira em tamanho de
  // destaque, com altura fixa no celular, tinha largura mínima maior do que a
  // coluna de 360 px: a sessão transbordava para o lado sem que o gate de
  // overflow do projeto notasse.
  test.use({ viewport: { width: 360, height: 780 } });

  test("os passos da sessão cabem sem rolagem lateral", async ({ page }) => {
    await page.goto("/estudar");
    await page.getByRole("button", { name: /Começar sessão/ }).click();
    await expect(
      page.getByRole("heading", { name: "De onde é esta bandeira?" })
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.getByRole("button", { name: /Não sei/ }).click();
    await expectNoHorizontalOverflow(page);

    await page.getByRole("button", { name: /Praticar/ }).click();
    await page
      .getByRole("button", { name: firstNew.displayNamePtBr, exact: true })
      .click();
    await expect(page.getByRole("button", { name: "Foi chute" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
