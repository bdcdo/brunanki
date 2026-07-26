import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    // Restos de build da hospedagem anterior (Cloudflare/OpenNext). Não há mais
    // script que os gere nem config que os leia — são 55 MB de lixo local que
    // sobreviveram à migração para o Fly. Ficam ignorados só para o lint não
    // tropeçar neles enquanto não forem apagados do disco.
    ".open-next/**",
    ".sites-build/**",
    ".wrangler/**",
    "node_modules/**",
    "public/flags/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**"
  ])
]);
