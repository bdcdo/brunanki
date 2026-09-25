import { expect, test } from "@playwright/test";

import {
  expectNoHorizontalOverflow,
  expectNoSeriousAccessibilityViolations
} from "./helpers";
import { MASTERY_STABILITY_DAYS } from "../src/domain/mastery";
import { americasIntroduction, seedProgress, type DueSkillState } from "./seed";

const [first, second, third] = americasIntroduction;
const dayMs = 24 * 60 * 60 * 1000;

/** As duas habilidades de uma bandeira dominada: estáveis, com dois dias de
 *  sucesso e sem vencer tão cedo. */
function masteredStates(entityId: string): DueSkillState[] {
  const inAMonth = new Date(Date.now() + 30 * dayMs);
  const successDays = [
    new Date(Date.now() - 20 * dayMs).toISOString().slice(0, 10),
    new Date(Date.now() - 5 * dayMs).toISOString().slice(0, 10)
  ];
  return (["flagToNameRecall", "nameToFlagRecognition"] as const).map(
    (skill) => ({
      entityId,
      skill,
      dueAt: inAMonth,
      stability: MASTERY_STABILITY_DAYS * 2,
      successDays
    })
  );
}

test("o álbum mostra as figurinhas coladas, em andamento e vazias", async ({
  page
}) => {
  await seedProgress(page, {
    dueStates: [
      ...masteredStates(first!.id),
      {
        entityId: second!.id,
        skill: "flagToNameRecall",
        dueAt: new Date(Date.now() + 2 * dayMs)
      }
    ]
  });
  await page.goto("/catalogo");

  await expect(
    page.getByRole("heading", { level: 1, name: "Álbum das Américas" })
  ).toBeVisible();
  await expect(page.getByText("1 de 35 coladas")).toBeVisible();

  // O estado vai no nome acessível de cada casa, e não só na forma.
  await expect(
    page.getByRole("link", { name: `1, ${first!.displayNamePtBr}, colada` })
  ).toBeVisible();
  await expect(
    page.getByRole("link", {
      name: `2, ${second!.displayNamePtBr}, em andamento`
    })
  ).toBeVisible();
  const empty = page.getByRole("link", {
    name: `3, ${third!.displayNamePtBr}, vazia`
  });
  await expect(empty).toBeVisible();
  // A casa vazia não mostra a bandeira que a pessoa ainda não viu.
  await expect(empty.locator("img")).toHaveCount(0);

  // Uma página por sub-região, na ordem do currículo.
  await expect(page.getByRole("heading", { level: 2 })).toHaveText([
    "América Setentrional",
    "América do Sul",
    "América Central",
    "Caribe"
  ]);

  await expectNoHorizontalOverflow(page);
  await expectNoSeriousAccessibilityViolations(page);
});

/** A uma resposta do domínio: o reconhecimento já firme, e a recordação
 *  vencida, estável, com um dia de sucesso só. */
function oneAnswerFromMastery(entityId: string): DueSkillState[] {
  const [recognition] = masteredStates(entityId).filter(
    ({ skill }) => skill === "nameToFlagRecognition"
  );
  return [
    recognition!,
    {
      entityId,
      skill: "flagToNameRecall",
      dueAt: new Date(Date.now() - dayMs),
      stability: MASTERY_STABILITY_DAYS + 10,
      successDays: [
        new Date(Date.now() - 10 * dayMs).toISOString().slice(0, 10)
      ]
    }
  ];
}

async function answerTheMasteringReview(page: import("@playwright/test").Page) {
  await seedProgress(page, { dueStates: oneAnswerFromMastery(first!.id) });
  await page.goto("/estudar");
  await page.getByRole("button", { name: /Começar sessão/ }).click();
  const field = page.getByRole("textbox", { name: "Nome da entidade" });
  await field.fill(first!.displayNamePtBr);
  await field.press("Enter");
  await expect(page.getByText("Figurinha colada")).toBeVisible();
  return page.getByTestId("sticker");
}

test("a resposta que domina a bandeira cola a figurinha", async ({ page }) => {
  const sticker = await answerTheMasteringReview(page);
  await expect(
    page.getByText(`Bandeira dominada: ${first!.displayNamePtBr}.`)
  ).toBeVisible();
  expect(
    await sticker.evaluate((element) => getComputedStyle(element).animationName)
  ).toBe("sticker-press");
  await expectNoSeriousAccessibilityViolations(page);

  // No álbum, a mesma bandeira aparece colada.
  await page.goto("/catalogo");
  await expect(
    page.getByRole("link", { name: `1, ${first!.displayNamePtBr}, colada` })
  ).toBeVisible();
});

test("com movimento reduzido, a figurinha aparece sem animação", async ({
  page
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const sticker = await answerTheMasteringReview(page);
  expect(
    await sticker.evaluate((element) => getComputedStyle(element).animationName)
  ).toBe("none");
});

test("Foi chute que desfaz o domínio descola a figurinha", async ({ page }) => {
  // O inverso do caso acima: a recordação firme e o reconhecimento a uma
  // resposta do domínio, que é a escolha em que Foi chute aparece.
  const [recall] = masteredStates(first!.id).filter(
    ({ skill }) => skill === "flagToNameRecall"
  );
  await seedProgress(page, {
    dueStates: [
      recall!,
      {
        entityId: first!.id,
        skill: "nameToFlagRecognition",
        dueAt: new Date(Date.now() - dayMs),
        stability: MASTERY_STABILITY_DAYS + 10,
        successDays: [
          new Date(Date.now() - 10 * dayMs).toISOString().slice(0, 10)
        ]
      }
    ]
  });
  await page.goto("/estudar");
  await page.getByRole("button", { name: /Começar sessão/ }).click();
  await page
    .getByRole("button", { name: /^Opção \d+: bandeira com / })
    .filter({ has: page.locator(`img[src="${first!.flagPath}"]`) })
    .click();
  await expect(page.getByText("Figurinha colada")).toBeVisible();

  const guess = page.getByRole("button", { name: "Foi chute" });
  await guess.click();
  await expect(guess).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Figurinha colada")).toHaveCount(0);

  await guess.click();
  await expect(page.getByText("Figurinha colada")).toBeVisible();
});

test("revisar uma bandeira já dominada não cola a figurinha de novo", async ({
  page
}) => {
  const states = masteredStates(first!.id).map((state) =>
    state.skill === "flagToNameRecall"
      ? { ...state, dueAt: new Date(Date.now() - dayMs) }
      : state
  );
  await seedProgress(page, { dueStates: states });
  await page.goto("/estudar");
  await page.getByRole("button", { name: /Começar sessão/ }).click();
  const field = page.getByRole("textbox", { name: "Nome da entidade" });
  await field.fill(first!.displayNamePtBr);
  await field.press("Enter");
  await expect(page.getByText("Acerto de primeira")).toBeVisible();
  await expect(page.getByText("Figurinha colada")).toHaveCount(0);
});
