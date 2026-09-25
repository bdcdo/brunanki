import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // `server-only` só resolve dentro do pipeline do Next; sem este alias,
      // qualquer teste que alcance @/data/catalog lança em jsdom.
      "server-only": fileURLToPath(
        new URL("./src/test/server-only-stub.ts", import.meta.url)
      )
    }
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    // `**/node_modules/**` e não `node_modules/**`: o segundo é ancorado na
    // raiz e deixa passar as dependências de qualquer worktree que o harness
    // crie em `.claude/worktrees/`, que a suíte então coleta e executa.
    exclude: ["e2e/**", "**/node_modules/**", ".claude/**"],
    coverage: {
      reporter: ["text", "html"],
      // Sem `include`, o v8 só reporta arquivos que algum teste importou, e a
      // tabela saía vazia. O alvo é o código de domínio e de armazenamento —
      // as camadas com regra de negócio.
      include: ["src/domain/**", "src/storage/**", "src/data/**"],
      exclude: ["**/__tests__/**", "**/*.json"],
      // Piso medido em 26/07/2026, arredondado para baixo. É um piso, não uma
      // meta: sobe conforme a suíte cresce, e não deve descer para acomodar
      // código novo sem teste.
      thresholds: {
        statements: 76,
        branches: 61,
        functions: 75,
        lines: 76
      }
    }
  }
});
