# ============================================
# LetterBookXD Web - Multi-stage Dockerfile
# ============================================

# ---- Base Stage ----
FROM node:20-alpine AS base
WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable pnpm

# ---- Dependencies Stage ----
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/config/package.json ./packages/config/
RUN pnpm install --frozen-lockfile --filter=@letterbookxd/web...

# ---- Builder Stage ----
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build --filter=@letterbookxd/web

# ---- Runner Stage ----
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 vite

# Copy built application
COPY --from=builder --chown=vite:nodejs /app/apps/web/dist ./dist
COPY --from=builder --chown=vite:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=vite:nodejs /app/apps/web/package.json ./package.json

USER vite

EXPOSE 3000

# Serve with a simple static server
CMD ["npx", "serve", "-s", "dist", "-l", "3000"]
