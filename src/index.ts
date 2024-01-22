import assert from "assert";
import { sql } from "kysely";
import { GetTransactionReceiptResponse } from "starknet";
import { contract, db, env, log, starknet } from "./env";
import { EventEventIndex, EventTxHash, NewEvent } from "./schemas/public/Event";

void main();

async function main() {
  log.info("Starting.");

  try {
    while (true) {
      await pullEvents();
      await updateTransactions();
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  } catch (e) {
    log.error("App failed.", e);
  }
}

async function pullEvents() {
  const lastEvent = await db
    .selectFrom("event")
    .select("blockIndex")
    .where("blockIndex", "is not", null)
    .orderBy("blockIndex", "desc")
    .limit(1)
    .executeTakeFirst();

  const blockNumber =
    lastEvent?.blockIndex != null
      ? lastEvent.blockIndex + 1
      : env.CONTRACT_BLOCK_NUMBER;

  let eventsChunk: Awaited<ReturnType<typeof starknet.getEvents>> | undefined;
  let eventsPulled = 0;

  await db.transaction().execute(async (trx) => {
    do {
      eventsChunk = await starknet.getEvents({
        chunk_size: 1000,
        address: env.CONTRACT_ADDRESS,
        from_block: {
          block_number: blockNumber,
        },
        to_block: "pending",
        continuation_token: eventsChunk?.continuation_token,
      });

      assert(eventsChunk != null, "Events chunk is null.");
      assert(typeof eventsChunk === "object", "Events chunk is not an object.");
      assert(
        Array.isArray(eventsChunk.events),
        "Events chunk is not an array.",
      );

      log.debug("Events chunk.", {
        eventsChunk,
      });

      eventsPulled += eventsChunk.events.length;

      log.info("Pulled events chunk.", {
        blockNumber,
        eventsPulled,
        eventsChunkLength: eventsChunk.events.length,
        continuationToken: eventsChunk.continuation_token,
      });

      if (eventsChunk.events.length > 0) {
        const values = eventsChunk.events.map<NewEvent>((emittedEvent, i) => {
          log.debug("Parsing event.", {
            blockNumber: emittedEvent.block_number,
            transactionHash: emittedEvent.transaction_hash,
          });

          const [ParsedEvent] = contract.parseEvents({
            events: [emittedEvent],
          } as GetTransactionReceiptResponse);

          const [eventName] = Object.keys(ParsedEvent);
          const eventContent = ParsedEvent[eventName];

          for (const [key, value] of Object.entries(eventContent)) {
            if (typeof value === "bigint") {
              eventContent[key] = value.toString();
            }
          }

          return {
            txHash: emittedEvent.transaction_hash as EventTxHash,
            eventIndex: i as EventEventIndex,
            blockIndex: emittedEvent.block_number,
            name: eventNameMap[eventName] ?? eventName,
            content: eventContent,
            txIndex: i,
            blockHash: emittedEvent.block_hash,
            updatedAt: new Date(),
            createdAt: new Date(),
          } satisfies NewEvent;
        });

        await trx
          .insertInto("event")
          .values(values)
          .onConflict((oc) => {
            return oc.columns(["txHash", "eventIndex"]).doUpdateSet((eb) => ({
              blockIndex: eb.ref("excluded.blockIndex"),
              name: eb.ref("excluded.name"),
              content: eb.ref("excluded.content"),
              txIndex: eb.ref("excluded.txIndex"),
              blockHash: eb.ref("excluded.blockHash"),
              updatedAt: eb.ref("excluded.updatedAt"),
            }));
          })
          .execute();

        log.info("Inserted events chunk.");
      }
    } while (eventsChunk.continuation_token);
  });

  if (eventsPulled > 0) {
    await refreshMaterializedViews();
  }
}

const eventNameMap = {
  GameCreated: "game_created",
  GameEvolved: "game_evolved",
  CellRevived: "cell_revived",
} as { [key: string]: string };

async function updateTransactions() {
  const transactionsToUpdate = await db
    .selectFrom("transaction")
    .selectAll()
    .where("status", "in", ["NOT_RECEIVED", "RECEIVED", "PENDING"])
    .execute();

  for (const transaction of transactionsToUpdate) {
    const tx = await starknet.getTransactionReceipt(transaction.hash);

    if ("block_hash" in tx) {
      transaction.blockHash = tx.block_hash;
    }

    transaction.status = tx.finality_status;
    transaction.updatedAt = new Date();

    log.info("Updating transaction.", {
      transactionHash: Number(transaction.hash),
      transactionStatus: transaction.status,
    });

    await db
      .updateTable("transaction")
      .set(transaction)
      .where("hash", "=", transaction.hash)
      .execute();
  }

  if (transactionsToUpdate.length > 0) {
    await refreshMaterializedViews();
  }
}

type MaterializedViewName = "balance" | "creator" | "infinite";

async function refreshMaterializedView(name: MaterializedViewName) {
  const query = sql`REFRESH MATERIALIZED VIEW CONCURRENTLY ${sql.table(name)}`;

  log.info("Refreshing materialized view.", { name });

  await query.execute(db);
}

async function refreshMaterializedViews() {
  log.info("Refreshing all materialized views.");

  await refreshMaterializedView("balance");
  await refreshMaterializedView("creator");
  await refreshMaterializedView("infinite");
}
