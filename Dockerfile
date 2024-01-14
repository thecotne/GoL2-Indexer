FROM node:20.11.0-alpine as build

WORKDIR /build

COPY package.json pnpm-lock.yaml /build/

RUN corepack enable && pnpm install

COPY src /build/src/

COPY tsconfig.json /build/

RUN pnpm build && pnpm pack

FROM node:20.11.0-alpine as app

WORKDIR /app

RUN <<EOF
  corepack enable
  pnpm init
  pnpm add dbmate@^2.10.0
EOF

COPY --from=build /build/gol2-indexer-0.0.0-source.tgz /app/

RUN pnpm add /app/gol2-indexer-0.0.0-source.tgz

COPY db /app/db/

CMD ["pnpm", "--shell-mode", "exec", "dbmate wait && dbmate up && gol2-indexer"]
