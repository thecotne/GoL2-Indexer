import { sql } from "kysely";
import { db, log } from "./env";

type MaterializedViewName = "balance" | "creator" | "infinite";

async function refreshMaterializedView(name: MaterializedViewName) {
  const query = sql`REFRESH MATERIALIZED VIEW CONCURRENTLY ${sql.table(name)}`;

  log.info("Refreshing materialized view.", { name });

  await query.execute(db);
}

export async function refreshMaterializedViews() {
  log.info("Refreshing all materialized views.");

  await refreshMaterializedView("balance");
  await refreshMaterializedView("creator");
  await refreshMaterializedView("infinite");
}
