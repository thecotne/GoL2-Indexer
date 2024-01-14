import "./schemas/knex-tables";
import "dotenv/config";
import { parseEnv } from "znv";
import { z } from "zod";
import Knex from "knex";
import { createLogger, format, transports } from "winston";

export const env = parseEnv(process.env, {
  DATABASE_URL: z.string(),
  CONTRACT_ADDRESS: z.string(),
  STARKNET_NETWORK_NAME: z.enum(["SN_MAIN", "SN_GOERLI"]),
  LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal"])
    .default("info"),
});

export const knex = Knex({
  client: "pg",
  connection: env.DATABASE_URL,
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
        `${timestamp} ${level}: ${message} ${JSON.stringify(obj, null, 2)}`
    )
  ),
  transports: [new transports.Console()],
});
