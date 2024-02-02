# GoL2 Indexer

## Quick start

- `source ./setup-install.sh` - install nvm, node and pnpm.
- `source ./setup-update.sh` - install up-to-date versions of nvm, node and pnpm.
- `pnpm dbmate up` - create the database and run migrations
- `pnpm build` - build the project
- `pnpm dev` - start the project
- `pnpm debug` - start the project with debug logs
- `pnpm clean` - remove `dist`
- `docker compose up --build` - start the project with docker
- `docker compose up -d` - start the project with docker in detached mode
- `docker compose up db -d` - start the database with docker
- `docker compose rm --stop` - stop and remove the project with docker
- `pnpm dotenv -- pnpm -c exec 'pgcli "$DATABASE_URL"'` - connect to the database with pgcli
- `pnpm update-db-types` - update the database schema
- `biome check --apply .` - check and format the code

## Env variables
- `DATABASE_URL` - Database connection string
- `CONTRACT_ADDRESS` - The contract address
  - [0x06dc4bd1212e67fd05b456a34b24a060c45aad08ab95843c42af31f86c7bd093](https://testnet.starkscan.co/contract/0x06dc4bd1212e67fd05b456a34b24a060c45aad08ab95843c42af31f86c7bd093) for old contract on Goerli
  - [0x077c08aed31ac023981de21e60b0bc0958a05f81943be057919c628994de86fe](https://testnet.starkscan.co/contract/0x077c08aed31ac023981de21e60b0bc0958a05f81943be057919c628994de86fe) for new contract on Goerli
  - [0x06a05844a03bb9e744479e3298f54705a35966ab04140d3d8dd797c1f6dc49d0](https://starkscan.co/contract/0x06a05844a03bb9e744479e3298f54705a35966ab04140d3d8dd797c1f6dc49d0) for Mainnet
  - 🤷‍♂️ for Sepolia
- `STARKNET_NETWORK_NAME` - The StarkNet network name
  - `SN_MAIN` for Mainnet
  - `SN_GOERLI` for Goerli
  - `SN_SEPOLIA` for Sepolia
- `CONTRACT_BLOCK_NUMBER` - The block number at which the contract was deployed
  - `267275` for old contract on Goerli
  - `921928` for new contract on Goerli
  - `4982` for Mainnet
  - 🤷‍♂️ for Sepolia

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
- [PostgreSQL](https://www.postgresql.org/) - The world's most advanced open source database.
- [Starknet.js](https://www.starknetjs.com/) - JavaScript library for Starknet
- [tsx](https://github.com/privatenumber/tsx) - TypeScript Execute: Node.js enhanced to run TypeScript & ESM
- [TypeScript](https://www.typescriptlang.org/) - Typed JavaScript at Any Scale.
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
