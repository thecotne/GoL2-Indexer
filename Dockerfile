# prepare base image
FROM node:20.11.0-alpine as base
WORKDIR /app

# prepare /app/node_modules
FROM base as prod
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --prod

# prepare /app/dist
FROM prod as build
RUN pnpm install
COPY src ./src/
COPY tsconfig.json ./
RUN pnpm build

# build final image
FROM base as app
COPY --from=prod /app/node_modules ./node_modules/
COPY --from=build /app/dist ./dist/
COPY db ./db/
CMD ["/bin/sh", "-c", "./node_modules/.bin/dbmate wait && ./node_modules/.bin/dbmate up && ./dist/index.mjs"]
