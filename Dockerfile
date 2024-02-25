FROM alpine:latest as node
RUN apk add nodejs

FROM node as pnpm
WORKDIR /src

ENV CI=true

RUN apk add npm
RUN npm install -g corepack
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY apps/indexer/package.json ./apps/indexer/

RUN pnpm install

############################################################
##################### Gol2 Web App #########################
############################################################

FROM pnpm as build-web

COPY apps/web/public ./apps/web/public/
COPY apps/web/app ./apps/web/app/
COPY apps/web/postcss.config.js ./apps/web/
COPY apps/web/tailwind.config.js ./apps/web/
COPY apps/web/tsconfig.json ./apps/web/
COPY apps/web/vite.config.ts ./apps/web/
COPY tsconfig.options.json tsconfig.projects.json ./

RUN pnpm run --filter=./apps/web build
RUN pnpm deploy --filter=./apps/web --prod /app

FROM node as web
WORKDIR /app

COPY --from=build-web /app/package.json ./
COPY --from=build-web /app/build ./build
COPY --from=build-web /app/node_modules ./node_modules

EXPOSE 3000

CMD ["./node_modules/.bin/remix-serve", "./build/server/index.js"]


############################################################
##################### Gol2 Indexer #########################
############################################################

FROM pnpm as build-indexer

COPY apps/indexer/src ./apps/indexer/src/
COPY apps/indexer/tsconfig.json ./apps/indexer/
COPY tsconfig.options.json tsconfig.projects.json ./

RUN pnpm run --filter=./apps/indexer build
RUN pnpm deploy --filter=./apps/indexer --prod /app

FROM node as indexer
WORKDIR /app

COPY --from=build-indexer /app/package.json ./
COPY --from=build-indexer /app/dist ./dist
COPY --from=build-indexer /app/node_modules ./node_modules

CMD ["./dist/index.mjs"]

############################################################
##################### Gol2 Migrations ######################
############################################################

FROM ghcr.io/amacneil/dbmate as dbmate

FROM alpine:latest as migrations

RUN apk add --no-cache postgresql-client tzdata

COPY --from=dbmate /usr/local/bin/dbmate /usr/local/bin/dbmate

WORKDIR /app
COPY db ./db/

ENV DBMATE_NO_DUMP_SCHEMA=true
ENTRYPOINT ["/usr/local/bin/dbmate"]
CMD ["--wait", "up"]
