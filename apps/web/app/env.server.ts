import { Kysely, PostgresDialect } from "kysely";
import pg from "pg";
import { RpcProvider, num } from "starknet";
import { createLogger, format, transports } from "winston";
import { parseEnv } from "znv";
import { z } from "zod";
import PublicSchema from "./schemas/Database";

if (import.meta.env.DEV) {
  const dotenv = await import("dotenv");
  const path = await import("path");

  dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
}

export const env = parseEnv(process.env, {
  DATABASE_URL: z.string(),
  INDEXER_CONFIG: z.string(),
  INDEXER_DELAY: z.number().default(3000),
  INFURA_API_KEY: z.string().nullable(),
  LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal"])
    .default("info"),
});

export const contracts = env.INDEXER_CONFIG.replace(/^\s*#.*/gm, "")
  .trim()
  .split(/\s*\n\s*/)
  .map((x) => {
    const [networkName, blockNumber, contractAddress] = x.trim().split(/\s+/);

    return {
      networkName,
      blockNumber: parseInt(blockNumber),
      contractAddress: num.cleanHex(contractAddress),
    };
  });

export const starknetGoerli = new RpcProvider({
  nodeUrl: env.INFURA_API_KEY
    ? `https://starknet-goerli.infura.io/v3/${env.INFURA_API_KEY}`
    : "SN_GOERLI",
});

export const starknetMainnet = new RpcProvider({
  nodeUrl: env.INFURA_API_KEY
    ? `https://starknet-mainnet.infura.io/v3/${env.INFURA_API_KEY}`
    : "SN_MAINNET",
});

export function starknet(provider: string) {
  return provider === "SN_GOERLI" ? starknetGoerli : starknetMainnet;
}

export const db = new Kysely<PublicSchema>({
  dialect: new PostgresDialect({
    pool: new pg.Pool({
      connectionString: env.DATABASE_URL,
    }),
  }),
});

export const log = createLogger({
  level: env.LOG_LEVEL,
  levels: {
    fatal: 0,
    error: 1,
    warn: 2,
    info: 3,
    debug: 4,
    trace: 5,
  } as { [K in typeof env.LOG_LEVEL]: number },
  format: format.combine(
    format.colorize(),
    format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss",
    }),
    format.errors({ stack: true }),
    format.splat(),
    format.printf(({ timestamp, level, message, ...obj }) => {
      return [
        `${timestamp} ${level}:`,
        message,
        JSON.stringify(obj, null, 2),
      ].join(" ");
    }),
  ),
  transports: [new transports.Console()],
});
