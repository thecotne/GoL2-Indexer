# Base Image
FROM alpine:3.18 as base
WORKDIR /app

# Node Image
FROM base as node
RUN apk add nodejs

# pnpm Image
FROM node as pnpm
WORKDIR /src

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY apps/indexer/package.json ./apps/indexer/

ENV CI=true

RUN <<EOF
  set -e
  apk add npm
  npm install -g corepack
  corepack enable
  pnpm install
EOF

# Build Gol2 Web Server
FROM pnpm as build-web

COPY apps/web/public ./apps/web/public/
COPY apps/web/app ./apps/web/app/
COPY apps/web/postcss.config.js ./apps/web/
COPY apps/web/tailwind.config.js ./apps/web/
COPY apps/web/tsconfig.json ./apps/web/
COPY apps/web/vite.config.ts ./apps/web/
COPY tsconfig.options.json tsconfig.projects.json ./

RUN <<EOF
  set -e
  pnpm run --filter=./apps/web build
  pnpm deploy --filter=./apps/web --prod /app
EOF

# Gol2 Web Server TARGET Image
FROM node as web

COPY --from=build-web /app ./

CMD ["./node_modules/.bin/remix-serve", "./build/server/index.js"]
EXPOSE 3000

# Build Gol2 Indexer
FROM pnpm as build-indexer

COPY apps/indexer/src ./apps/indexer/src/
COPY apps/indexer/tsconfig.json ./apps/indexer/
COPY tsconfig.options.json tsconfig.projects.json ./

RUN <<EOF
  set -e
  pnpm run --filter=./apps/indexer build
  pnpm deploy --filter=./apps/indexer --prod /app
EOF

# Gol2 Indexer TARGET Image
FROM node as indexer

COPY --from=build-indexer /app ./

CMD ["./dist/index.mjs"]

# dbmate Image
FROM ghcr.io/amacneil/dbmate as dbmate

# Gol2 Migrations TARGET Image
FROM base as migrations

RUN apk add --no-cache postgresql-client tzdata

COPY --from=dbmate /usr/local/bin/dbmate /usr/local/bin/dbmate
COPY db ./db/

ENV DBMATE_NO_DUMP_SCHEMA=true

ENTRYPOINT ["/usr/local/bin/dbmate"]
CMD ["--wait", "up"]
