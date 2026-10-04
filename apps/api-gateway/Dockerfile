FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./
COPY apps/api-gateway/package.json ./apps/api-gateway/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/config/package.json ./packages/config/
RUN corepack enable pnpm && pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable pnpm && pnpm build --filter=@letterbookxd/api-gateway

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/apps/api-gateway/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api-gateway/package.json ./package.json

EXPOSE 8080
CMD ["node", "dist/index.js"]