import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry"
  },
  webServer: {
    // Build de produção, e não `pnpm dev`. Com o dev server, o React não
    // hidratava as telas e nenhuma interação surtia efeito: digitar no campo
    // de busca do catálogo deixava o contador de resultados parado, e a suíte
    // falhava em 12 dos 16 testes por um motivo que não existe no app
    // publicado. Testar o artefato que vai ao ar também é o que faz sentido.
    command: "pnpm build && pnpm start",
    url: "http://127.0.0.1:3000",
    // Reusar um servidor já de pé é conveniente localmente, mas no CI
    // esconderia um build velho.
    reuseExistingServer: !process.env.CI,
    timeout: 240_000
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } }
  ]
});
