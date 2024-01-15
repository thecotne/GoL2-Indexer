# GoL2 Indexer

## Quick start

- `source ./setup-install.sh` - install nvm, node and pnpm.
- `source ./setup-update.sh` - install up-to-date versions of nvm, node and pnpm.
- `pnpm dbmate up` - create the database and run migrations
- `pnpm build` - build the project
- `pnpm dev` - start the project
- `pnpm debug` - start the project with debug logs
- `pnpm package` - build `dist`, `gol2-indexer-0.0.0-source.tgz` and `package`
- `pnpm clean` - remove `dist`, `gol2-indexer-0.0.0-source.tgz` and `package`
- `docker compose up --build` - start the project with docker
- `docker compose up -d` - start the project with docker in detached mode
- `docker compose up db -d` - start the database with docker
- `docker compose rm --stop` - stop the project with docker
- `pnpm dotenv -- pnpm -c exec 'pgcli "$DATABASE_URL"'` - connect to the database
- `pnpm kanel` - update the database schema

## Env variables
- `DATABASE_URL` - Database connection string
- `CONTRACT_ADDRESS` - The contract address
  - [0x06dc4bd1212e67fd05b456a34b24a060c45aad08ab95843c42af31f86c7bd093](https://testnet.starkscan.co/contract/0x06dc4bd1212e67fd05b456a34b24a060c45aad08ab95843c42af31f86c7bd093) for Goerli
  - [0x06a05844a03bb9e744479e3298f54705a35966ab04140d3d8dd797c1f6dc49d0](https://starkscan.co/contract/0x06a05844a03bb9e744479e3298f54705a35966ab04140d3d8dd797c1f6dc49d0) for Mainnet
- `STARKNET_NETWORK_NAME` - The StarkNet network name
  - `SN_GOERLI` for Goerli
  - `SN_MAIN` for Mainnet
- `CONTRACT_BLOCK_NUMBER` - The block number at which the contract was deployed
  - `267275` for Goerli
  - `4982` for Mainnet
