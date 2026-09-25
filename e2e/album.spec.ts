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
