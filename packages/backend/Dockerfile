# Stage 1: Base
FROM node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Stage 2: Install dependencies
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/backend/package.json ./packages/backend/package.json
RUN pnpm install --frozen-lockfile --filter @daily-content-brain/backend

# Stage 3: Build
FROM deps AS build
COPY packages/backend ./packages/backend
RUN pnpm --filter @daily-content-brain/backend exec prisma generate
RUN pnpm --filter @daily-content-brain/backend build

# Stage 4: Production
FROM base AS production
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/backend/node_modules ./packages/backend/node_modules
COPY --from=build /app/packages/backend/dist ./packages/backend/dist
COPY --from=build /app/packages/backend/package.json ./packages/backend/package.json
COPY --from=build /app/packages/backend/prisma ./packages/backend/prisma

WORKDIR /app/packages/backend

EXPOSE 3001

CMD ["node", "dist/index.js"]
