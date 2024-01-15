import { sql } from "kysely";
import {
  constants,
  Contract,
  GetTransactionReceiptResponse,
  RpcProvider,
  Uint256,
  num,
  uint256,
} from "starknet";
import { abi } from "./abi";
import { db, env, log } from "./env";
import { EventEventIndex, EventTxHash, NewEvent } from "./schemas/public/Event";

const starknet = new RpcProvider({
  chainId:
    env.STARKNET_NETWORK_NAME === "SN_MAIN"
      ? constants.StarknetChainId.SN_MAIN
      : constants.StarknetChainId.SN_GOERLI,
});
const contract = new Contract(abi, env.CONTRACT_ADDRESS, starknet);

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

export async function pullEvents() {
  const lastEvent = await db
    .selectFrom("event")
    .select("blockIndex")
    .orderBy("blockIndex", "desc")
    .limit(1)
    .executeTakeFirst();

  const blockNumber = lastEvent
    ? lastEvent.blockIndex + 1
    : env.CONTRACT_BLOCK_NUMBER;

  let eventsChunk = await starknet.getEvents({
    chunk_size: 1000,
    address: env.CONTRACT_ADDRESS,
    from_block: {
      block_number: blockNumber,
    },
  });

  log.debug("Events chunk.", {
    eventsChunk,
  });

  log.info("Pulled events chunk.", {
    blockNumber,
    eventsChunkLength: eventsChunk.events.length,
    continuationToken: eventsChunk.continuation_token,
  });

  const eventRecords: NewEvent[] = [];

  while (eventsChunk) {
    if (eventsChunk.events.length > 0) {
      eventRecords.push(
        ...eventsChunk.events.map((emittedEvent, i) => {
          log.debug("Parsing event.", {
            blockNumber: emittedEvent.block_number,
            transactionHash: emittedEvent.transaction_hash,
          });
          const [ParsedEvent] = contract.parseEvents({
            events: [emittedEvent],
          } as GetTransactionReceiptResponse);

          const [eventName] = Object.keys(ParsedEvent);
          const eventContent = ParsedEvent[eventName];

          const eventAbi = abi.find((entry) => entry.name === eventName);

          if (eventAbi != null && eventAbi.data != null) {
            for (const member of eventAbi.data) {
              if (member.type === "Uint256") {
                eventContent[member.name] = uint256
                  .uint256ToBN(eventContent[member.name] as Uint256)
                  .toString();
              }
              if (member.type === "felt") {
                eventContent[member.name] = num
                  .toBigInt(eventContent[member.name] as number)
                  .toString();
              }
              log.debug("Parsed event member.", {
                memberName: member.name,
                memberType: member.type,
                memberValue: eventContent[member.name],
              });
            }
          }

          return {
            txHash: emittedEvent.transaction_hash as EventTxHash,
            eventIndex: i as EventEventIndex,
            blockIndex: emittedEvent.block_number,
            name: eventName,
            content: eventContent,
            txIndex: i,
            blockHash: emittedEvent.block_hash,
            createdAt: new Date(),
          } satisfies NewEvent;
        }),
      );
    }

    if (eventsChunk.continuation_token) {
      eventsChunk = await starknet.getEvents({
        chunk_size: 1000,
        address: env.CONTRACT_ADDRESS,
        continuation_token: eventsChunk.continuation_token,
      });

      log.debug("Events chunk.", {
        eventsChunk,
      });

      log.info("Pulled events chunk.", {
        blockNumber,
        eventsChunkLength: eventsChunk.events.length,
        continuationToken: eventsChunk.continuation_token,
      });
    } else {
      break;
    }
  }

  if (eventRecords.length === 0) return;

  await db.transaction().execute(async (trx) => {
    for (let i = 0; i < eventRecords.length; i += 1000) {
      log.info("Inserting events.", {
        from: i,
        to: i + 1000,
      });

      await trx
        .insertInto("event")
        .values(eventRecords.slice(i, i + 1000))
        .execute();
    }
  });

  await refreshMaterializedViews();
}

export async function updateTransactions() {
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

export async function refreshMaterializedViews() {
  log.info("Refreshing all materialized views.");

  await refreshMaterializedView("balance");
  await refreshMaterializedView("creator");
  await refreshMaterializedView("infinite");
}
