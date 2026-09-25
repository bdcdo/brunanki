import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    // O harness cria worktrees em `.claude/worktrees/<nome>`, dentro deste
    // diretório. Cada um traz o próprio `node_modules` e o próprio
    // `coverage`, que os globs abaixo não alcançam por serem ancorados na
    // raiz — sem esta linha, o lint audita o repositório inteiro de outra
    // sessão junto com o desta.
    ".claude/**",
    "node_modules/**",
    "public/flags/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**"
  ])
]);
