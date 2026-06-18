###################
# BUILD FOR PRODUCTION
###################

FROM node:24 AS build
RUN corepack prepare pnpm@10.18.0 --activate

# pnpm refuses destructive operations (e.g. prune) without a TTY unless CI is set
ENV CI=true

WORKDIR /usr/src/app

COPY --chown=node:node pnpm-lock.yaml ./
COPY --chown=node:node package.json ./

RUN corepack pnpm fetch --prod
RUN corepack pnpm install

COPY --chown=node:node . .

RUN corepack pnpm build

ENV NODE_ENV=production

RUN corepack pnpm prune --prod

USER node

###################
# PRODUCTION
###################

FROM node:24-alpine AS production

COPY --chown=node:node --from=build /usr/src/app/node_modules ./node_modules
COPY --chown=node:node --from=build /usr/src/app/dist ./dist

CMD [ "node", "dist/main.js" ]
