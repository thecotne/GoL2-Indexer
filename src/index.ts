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

  const latestAcceptedBlock = await starknet.getBlockLatestAccepted();
  const blockNumber = Math.min(
    latestAcceptedBlock.block_number,
    lastEvent?.blockIndex != null
      ? lastEvent.blockIndex
      : env.CONTRACT_BLOCK_NUMBER,
  );
  let eventsChunk: Awaited<ReturnType<typeof starknet.getEvents>> | undefined;
  let eventsPulled = 0;

  do {
    log.info("Pulling events chunk.", {
      chunk_size: 1000,
      address: env.CONTRACT_ADDRESS,
      from_block: {
        block_number: blockNumber,
      },
      to_block: "pending",
      continuation_token: eventsChunk?.continuation_token,
    });

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
    assert(Array.isArray(eventsChunk.events), "Events chunk is not an array.");

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
      const values: NewEvent[] = [];
      let blockHash: string | null = null;
      let txHash: string | null = null;
      let txIndex = 0;
      let eventIndex = 0;

      for (const emittedEvent of eventsChunk.events.values()) {
        if (emittedEvent.block_hash !== blockHash) {
          blockHash = emittedEvent.block_hash;
          txHash = emittedEvent.transaction_hash;
          txIndex = 0;
          eventIndex = 0;
        } else {
          if (emittedEvent.transaction_hash !== txHash) {
            txHash = emittedEvent.transaction_hash;
            txIndex++;
          } else {
            eventIndex++;
          }
        }

        log.debug("Parsing event.", {
          blockNumber: emittedEvent.block_number,
          transactionHash: emittedEvent.transaction_hash,
        });

        const [ParsedEvent] = contract.parseEvents({
          events: [emittedEvent],
        } as GetTransactionReceiptResponse);
        const [eventName] = Object.keys(ParsedEvent);

        const eventContent: { [key: string]: unknown } = {};

        for (const [key, value] of Object.entries(ParsedEvent[eventName])) {
          if (typeof value === "bigint") {
            eventContent[key] = value.toString();
          }
        }

        values.push({
          txHash: emittedEvent.transaction_hash as EventTxHash,
          txFinalityStatus:
            emittedEvent.block_number != null ? "ACCEPTED_ON_L2" : "RECEIVED",
          txExecutionStatus:
            emittedEvent.block_number != null ? "SUCCEEDED" : null,
          eventIndex: eventIndex as EventEventIndex,
          blockIndex: emittedEvent.block_number,
          name: eventNameMap[eventName] ?? eventName,
          content: eventContent,
          txIndex,
          blockHash: emittedEvent.block_hash,
          updatedAt: new Date(),
          createdAt: new Date(),
        });
      }

      await db
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

      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  } while (eventsChunk.continuation_token);

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
    .where("finalityStatus", "in", ["NOT_RECEIVED", "RECEIVED", "PENDING"])
    .execute();

  log.info("transactionsToUpdate", transactionsToUpdate);

  for (const transaction of transactionsToUpdate) {
    const tx = await starknet.getTransactionStatus(transaction.hash);

    transaction.finalityStatus = tx.finality_status;
    transaction.executionStatus = tx.execution_status ?? null;
    transaction.updatedAt = new Date();

    log.info("Updating transaction.", {
      transactionHash: Number(transaction.hash),
      finalityStatus: transaction.finalityStatus,
      executionStatus: transaction.executionStatus,
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
