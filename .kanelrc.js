require("dotenv/config");

const { generateKnexTablesModule } = require("kanel-knex");

/** @type {import('kanel').Config} */
module.exports = {
  connection: process.env.DATABASE_URL,
  
  preDeleteOutputFolder: true,
  outputPath: "./src/schemas",

  preRenderHooks: [generateKnexTablesModule],
};
