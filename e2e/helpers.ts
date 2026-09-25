import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

/**
 * Os dois gates que toda tela atravessa.
 *
 * Vivem aqui, e não dentro de um spec, porque a suíte passou a ter mais de um
 * arquivo: `session.spec.ts` precisa dos mesmos gates que `brunanki.spec.ts`, e
 * duplicá-los deixaria dois critérios de aceite que envelhecem em separado.
 */

export async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth
  }));

  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
}

export async function expectNoSeriousAccessibilityViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  const seriousViolations = results.violations.filter(
    ({ impact }) => impact === "serious" || impact === "critical"
  );

  expect(
    seriousViolations,
    seriousViolations
      .map(
        ({ id, help, nodes }) =>
          `${id}: ${help} (${nodes.length} ocorrência(s))`
      )
      .join("\n")
  ).toEqual([]);
}
