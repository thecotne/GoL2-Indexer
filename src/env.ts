import "dotenv/config";
import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";
import { Contract, RpcProvider } from "starknet";
import { createLogger, format, transports } from "winston";
import { parseEnv } from "znv";
import { z } from "zod";
import { abi } from "./abi";
import PublicSchema from "./schemas/public/PublicSchema";

export const env = parseEnv(process.env, {
  DATABASE_URL: z.string(),
  CONTRACT_ADDRESS: z.string(),
  CONTRACT_BLOCK_NUMBER: z.number(),
  STARKNET_NETWORK_NAME: z.enum(["SN_MAIN", "SN_GOERLI", "SN_SEPOLIA"]),
  LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal"])
    .default("info"),
});

export const starknet = new RpcProvider({
  nodeUrl: env.STARKNET_NETWORK_NAME,
});

export const contract = new Contract(abi, env.CONTRACT_ADDRESS, starknet);

export const db = new Kysely<PublicSchema>({
  dialect: new PostgresDialect({
    pool: new Pool({
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
    format.printf(
      ({ timestamp, level, message, ...obj }) =>
        `${timestamp} ${level}: ${message} ${JSON.stringify(obj, null, 2)}`,
    ),
  ),
  transports: [new transports.Console()],
});
