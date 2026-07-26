# syntax=docker/dockerfile:1
# Imagem do Ptanki (Next.js com output standalone) para o Fly.io.
# O app não tem backend, banco nem variável de ambiente: todo o estado do
# usuário vive no IndexedDB do navegador. Por isso não há ARG/ENV de build —
# nada precisa ser embutido no bundle de browser.

FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /app

# ── deps ─────────────────────────────────────────────────────────────────────
FROM base AS deps
# pnpm-workspace.yaml carrega o allowBuilds; sem ele no contexto, o pnpm 11
# bloqueia os build scripts nativos e o install diverge do lockfile.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# O pnpm 11.5 sai com código 1 sempre que há build script ignorado (gate
# ERR_PNPM_IGNORED_BUILDS), em parte por um bug de cache (pnpm#11862) que
# dispara mesmo com allowBuilds respeitado. O fallback `approve-builds --all`
# zera o conjunto de ignorados; o re-install em seguida confirma o estado — se
# a falha original era real (rede, lockfile), ela reaparece e quebra o build em
# vez de seguir com node_modules incompleto.
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
  pnpm install --frozen-lockfile \
  || { pnpm approve-builds --all && pnpm install --frozen-lockfile; }

# ── build ────────────────────────────────────────────────────────────────────
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
RUN pnpm build

# ── runner ───────────────────────────────────────────────────────────────────
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

# O server.js do layout standalone não copia `public` nem `.next/static` por
# conta própria; colocados nestes caminhos, ele passa a servi-los sozinho.
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000
# HOSTNAME=0.0.0.0 é obrigatório: sem isso o server escuta em localhost e o
# proxy do Fly não alcança o processo.
ENV PORT=3000 HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
