# GoL2 Indexer

## Quick start

- `pnpm dbmate up` - create the database and run migrations
- `pnpm build` - build all the projects
- `pnpm dev` - start all the projects
- `pnpm debug` - start all the projects with debug logs
- `pnpm prod` - start all the projects in production mode
- `pnpm pgcli` - connect to the database with pgcli
- `pnpm check` - check the code
- `pnpm fix` - check and fromat the code
- `pnpm kanel` - generate types from the database
- `pnpm apps` - run a script in all the projects (e.g. `pnpm apps build`)
- `pnpm apps:web` - run a script in the web project (e.g. `pnpm apps:web build`)
- `pnpm apps:indexer` - run a script in the indexer project (e.g. `pnpm apps:indexer build`)

### Docker Compose commands

- `docker compose build` - build all the images
  - `docker compose build indexer` - build the indexer image
  - `docker compose build web` - build the web image
  - `docker compose build migrations` - build the migrations image
- `docker compose up` - start all the services
  - `docker compose up -d` - start all the services in the background
  - `docker compose up db -d` - start the database in the background
- `dpcker compose rm` - remove all stopped services
  - `docker compose rm --stop` - stop and remove all the services

### `setup-*.sh` scripts

- `source ./setup-install.sh` - install nvm, node and pnpm.
- `source ./setup-update.sh` - install up-to-date versions of nvm, node and pnpm.

## Env variables

### Required Env Variables

- `DATABASE_URL` - Database connection string
- `INDEXER_CONFIG` - The indexer configuration
  - `STARKNET_NETWORK_NAME CONTRACT_BLOCK_NUMBER CONTRACT_ADDRESS` for each contract
    - `STARKNET_NETWORK_NAME` - The StarkNet network name (`SN_GOERLI` or `SN_MAIN`)
    - `CONTRACT_BLOCK_NUMBER` - The block number at which the contract was deployed
    - `CONTRACT_ADDRESS` - The contract address
  - Example:
    - `SN_GOERLI 942318 0x05bd17bba6b3cb9740bcc0f20f93ecf443250c4f09d94e4ab32d3bdffc7ebba2`
    - `SN_MAIN 526494 0x079294c688eb80e025f298b1ab2d30dd7a4a316ed592ac2fc124710564e4e911`
    - `SN_GOERLI 267275 0x06dc4bd1212e67fd05b456a34b24a060c45aad08ab95843c42af31f86c7bd093`
    - `SN_MAIN 4982 0x06a05844a03bb9e744479e3298f54705a35966ab04140d3d8dd797c1f6dc49d0`

### Optional Env Variables

- `DBMATE_MIGRATIONS_DIR` - The directory where the migrations are located (default: `db/migrations`)
- `DBMATE_SCHEMA_FILE` - The file where the schema is located (default: `db/schema.sql`)
- `INFURA_API_KEY` - The Infura API key (nullable)
- `INDEXER_DELAY` - The delay between indexing (in milliseconds) (default: `3000`)
- `LOG_LEVEL` - The log level (`trace`, `debug`, `info`, `warn`, `error`, `fatal`) (default: `info`)

## Tools and libraries used

- [Biome](https://biomejs.dev/) - Format, lint, and more in a fraction of a second.
- [dbmate](https://github.com/amacneil/dbmate) - A lightweight, framework-agnostic database migration tool.
- [Docker Compose](https://docs.docker.com/compose/) - Define and run multi-container applications with Docker.
- [Docker](https://www.docker.com/) - Build, Share, and Run Any App, Anywhere.
- [dotenv-cli](https://github.com/venthur/dotenv-cli) - A cli to load dotenv files.
- [dotenv](https://github.com/motdotla/dotenv) - Loads environment variables from .env for nodejs projects.
- [Kanel](https://github.com/kristiandupont/kanel) - Generate Typescript types from Postgres.
- [Kysely extension for Kanel](https://github.com/kristiandupont/kanel/tree/main/packages/kanel-kysely) - Generate Kysely types from Postgres.
- [Kysely](https://kysely.dev/) - The type-safe SQL query builder for TypeScript.
- [Node Version Manager](https://github.com/nvm-sh/nvm) - POSIX-compliant bash script to manage multiple active node.js versions.
- [node-postgres](https://node-postgres.com/)- PostgreSQL client for node.js.
- [Node.js](https://nodejs.org/) - JavaScript runtime.
- [Pgcli](https://www.pgcli.com/) - A command line interface for Postgres with auto-completion and syntax highlighting.
- [pkgroll](https://github.com/privatenumber/pkgroll) - Next-gen package bundler for TypeScript & ESM.
- [pnpm](https://pnpm.io/) - Fast, disk space efficient package manager.
- [PostCSS](https://postcss.org/) - A tool for transforming CSS with JavaScript plugins.
- [PostgreSQL](https://www.postgresql.org/) - The world's most advanced open source database.
- [react](https://react.dev/) - A JavaScript library for building user interfaces.
- [remix-run](https://remix.run/) - The full-stack web framework for the modern web.
- [shadcn-ui](https://ui.shadcn.com/) - Beautifully designed components that you can copy and paste into your apps.
- [Starknet.js](https://www.starknetjs.com/) - JavaScript library for Starknet
- [Tailwind CSS](https://tailwindcss.com/) - A utility-first CSS framework for rapid UI development.
- [TanStack Table](https://tanstack.com/table/latest) - Headless UI for building powerful tables & datagrids.
- [tsx](https://github.com/privatenumber/tsx) - TypeScript Execute: Node.js enhanced to run TypeScript & ESM
- [TypeScript](https://www.typescriptlang.org/) - Typed JavaScript at Any Scale.
- [Vite](https://vitejs.dev/) - Next generation frontend tooling. It's fast!
- [winston](https://github.com/winstonjs/winston) - A logger for just about everything.
- [znv](https://github.com/lostfictions/znv) - Type-safe environment parsing and validation for Node.js with Zod schemas.
- [Zod](https://zod.dev/) - TypeScript-first schema validation with static type inference.

## Related projects

- Cairo Contracts
  - [perama-v/GoL2](https://github.com/perama-v/GoL2)
  - [software-mansion-labs/GoL2](https://github.com/software-mansion-labs/GoL2)
  - [0xDegenDeveloper/gol2](https://github.com/0xDegenDeveloper/gol2)
- Indexers
  - [software-mansion-labs/GoL2/indexer](https://github.com/software-mansion-labs/GoL2/tree/main/indexer)
  - [yuki-wtf/GoL2-Contract/indexer](https://github.com/yuki-wtf/GoL2-Contract/tree/main/indexer)
- Frontends
  - [yuki-wtf/gol2](https://github.com/yuki-wtf/gol2)
