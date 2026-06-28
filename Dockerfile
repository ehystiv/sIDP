###################
# BUILD
###################
FROM node:24-alpine AS build

RUN corepack enable && corepack prepare pnpm@10.18.0 --activate

# Required to compile native addons (argon2, unrs-resolver)
RUN apk add --no-cache python3 make g++

# Needed by pnpm for non-interactive destructive operations (prune)
ENV CI=true

WORKDIR /app

# Fetch backend deps into the virtual store (only lockfile needed, so this
# layer is invalidated only when the lockfile changes — not on source edits)
COPY pnpm-lock.yaml ./
RUN pnpm fetch

COPY package.json ./
RUN pnpm install --frozen-lockfile --offline

# Copy source and build backend + frontend SPA
COPY . .
RUN pnpm run build:all

# Strip devDependencies before copying to the production image
ENV NODE_ENV=production
RUN pnpm prune --prod

###################
# PRODUCTION
###################
FROM node:24-alpine AS production

ENV NODE_ENV=production

WORKDIR /app

# node_modules contains native binaries compiled for Alpine — both stages
# use node:24-alpine so the binaries are compatible
COPY --chown=node:node --from=build /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/dist ./dist
# ServeStaticModule resolves join(__dirname, '..', 'frontend', 'dist') → /app/frontend/dist
COPY --chown=node:node --from=build /app/frontend/dist ./frontend/dist

USER node

EXPOSE 3000

CMD ["node", "dist/main.js"]
