FROM node:20.11.0-alpine as base

FROM base as src
WORKDIR /src

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/indexer/package.json ./apps/indexer/

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

COPY apps/indexer/src ./apps/indexer/src/
COPY apps/indexer/tsconfig.json ./apps/indexer/

RUN pnpm build
RUN pnpm deploy --filter=./apps/indexer --prod /app

# build final image
FROM base as app
WORKDIR /app

COPY --from=src /app ./
COPY apps/indexer/db ./db/

CMD ["/bin/sh", "-c", "./node_modules/.bin/dbmate wait && ./node_modules/.bin/dbmate up && ./dist/index.mjs"]
