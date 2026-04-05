# Stage 1: Base
FROM node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Stage 2: Install dependencies
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/frontend/package.json ./packages/frontend/package.json
RUN pnpm install --frozen-lockfile --filter @daily-content-brain/frontend

# Stage 3: Build
FROM deps AS build
COPY packages/frontend ./packages/frontend
RUN cd packages/frontend && npx nuxt build

# Stage 4: Production
FROM base AS production
WORKDIR /app/packages/frontend

COPY --from=build /app/packages/frontend/.output ./.output
COPY --from=build /app/packages/frontend/package.json ./package.json

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
