import { expect, test } from "@playwright/test";

import {
  expectNoHorizontalOverflow,
  expectNoSeriousAccessibilityViolations
} from "./helpers";
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
      stability: 60,
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
      stability: 40,
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
    page.getByText(`${first!.displayNamePtBr} entrou para o álbum.`)
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
