require("dotenv/config");

const { makeKyselyHook } = require("kanel-kysely");

/** @type {import('kanel').Config} */
module.exports = {
  connection: process.env.DATABASE_URL,

  preDeleteOutputFolder: true,
  outputPath: "./src/schemas",

  preRenderHooks: [makeKyselyHook()],
};
