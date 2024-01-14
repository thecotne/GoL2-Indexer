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
import { env, knex, log } from "./env";
import {
  EventEventIndex,
  EventInitializer,
  EventTxHash,
} from "./schemas/public/Event";

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
  const [lastEvent] = await knex("event")
    .select("*")
    .orderBy("blockIndex", "desc")
    .limit(1);

  const blockNumber = lastEvent ? lastEvent.blockIndex + 1 : 1;

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
  });

  const eventRecords: EventInitializer[] = [];

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
          } satisfies EventInitializer;
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
        eventsChunkLength: eventsChunk.events.length,
      });
    } else {
      break;
    }
  }

  if (eventRecords.length === 0) return;

  await knex.batchInsert("event", eventRecords, 1000);

  await refreshMaterializedViews();
}

export async function updateTransactions() {
  const transactionsToUpdate = await knex("transaction")
    .select("*")
    .whereIn("status", [
      "NOT_RECEIVED",
      "RECEIVED",
      "PENDING",
      // "ACCEPTED_ON_L2",
    ]);

  for (const transaction in transactionsToUpdate) {
    const tx = await starknet.getTransactionReceipt(
      transactionsToUpdate[transaction].hash,
    );

    if ("block_hash" in tx) {
      transactionsToUpdate[transaction].blockHash = tx.block_hash;
    }

    transactionsToUpdate[transaction].status = tx.finality_status;
    transactionsToUpdate[transaction].updatedAt = new Date();
    // transactionsToUpdate[transaction].errorContent = tx.tx_failure_reason!;

    log.info("Updating transaction.", {
      transactionHash: Number(transactionsToUpdate[transaction].hash),
      transactionStatus: transactionsToUpdate[transaction].status,
    });

    await knex("transaction").upsert(transactionsToUpdate);

    await refreshMaterializedViews();
  }
}

export async function refreshMaterializedViews() {
  log.info("Refreshing all materialized views.");

  await knex.schema
    .refreshMaterializedView("balance", true)
    .refreshMaterializedView("creator", true)
    .refreshMaterializedView("infinite", true);
}
