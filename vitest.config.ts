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
    exclude: ["e2e/**", "node_modules/**"],
    coverage: {
      reporter: ["text", "html"]
    }
  }
});
