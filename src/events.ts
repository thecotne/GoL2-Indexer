import assert from "assert";
import {
  events,
  CallData,
  ContractClassResponse,
  Event,
  ParsedEvent,
  ParsedStruct,
  hash,
  num,
  uint256,
} from "starknet";
import { db, env, log, starknet } from "./env";
import { EventEventIndex, EventTxHash, NewEvent } from "./schemas/public/Event";
import { refreshMaterializedViews } from "./views";

// --- contract classes ---
const contractClasses: Map<string, ContractClassResponse> = new Map();

async function prepareContractClasses() {
  await prepareContractClass(
    await starknet.getClassHashAt(
      env.CONTRACT_ADDRESS,
      env.CONTRACT_BLOCK_NUMBER,
    ),
  );

  await prepareContractClass(
    await starknet.getClassHashAt(env.CONTRACT_ADDRESS, "latest"),
  );

  const upgradeEvents = await db
    .selectFrom("event")
    .selectAll()
    .where("event.name", "=", "Upgraded")
    .execute();

  for (const upgradeEvent of upgradeEvents) {
    const implementation = num.toHex(
      (upgradeEvent.content as { implementation: string }).implementation,
    );

    if (typeof implementation === "string") {
      await prepareContractClass(implementation);
    }
  }
}

async function prepareContractClass(classHash: string) {
  if (!contractClasses.get(classHash)) {
    log.info("Fetching contract class.", { classHash });

    contractClasses.set(classHash, await starknet.getClassByHash(classHash));
  }
}

// --- events ---
function parseEvent(event: Event): ParsedEvent {
  for (const { abi } of contractClasses.values()) {
    try {
      const legacyFormatAbi = new CallData(abi).parser.getLegacyFormat();
      const parsedEvent = events
        .parseEvents(
          [JSON.parse(JSON.stringify(event))],
          events.getAbiEvents(legacyFormatAbi),
          CallData.getAbiStruct(legacyFormatAbi),
          CallData.getAbiEnum(legacyFormatAbi),
        )
        .at(0);

      if (parsedEvent) return parsedEvent;
    } catch {}
  }

  log.info("Failed to parse event.", { event });

  throw new Error("Failed to parse event.");
}

interface ParsedEventObject<E extends Event> {
  eventName: string;
  parsedStruct: ParsedStruct;
  event: E;
}

async function parseEvents<E extends Event>(
  events: Array<E>,
): Promise<Array<ParsedEventObject<E>>> {
  for (const event of events) {
    if (event.keys[0] === hash.getSelectorFromName("Upgraded")) {
      await prepareContractClass(num.toHex(event.data[0]));
    }
  }

  const parsedEvents = events.map((event) => {
    const parsedEvent = parseEvent(event);

    const [eventName] = Object.keys(parsedEvent);
    const parsedStruct = parsedEvent[eventName];

    for (const [key, value] of Object.entries(parsedStruct)) {
      if (typeof value === "bigint") {
        parsedStruct[key] = value.toString();
      }

      if (typeof value === "object" && "low" in value && "high" in value) {
        const { low, high } = value;
        if (typeof low === "bigint" && typeof high === "bigint") {
          parsedStruct[key] = uint256
            .uint256ToBN({
              low,
              high,
            })
            .toString();
        }
      }
    }

    if ("from" in parsedStruct) {
      parsedStruct.from_ = parsedStruct.from;

      // biome-ignore lint/performance/noDelete: Need to delete the key
      delete parsedStruct.from;
    }

    const eventNameMap = {
      GameCreated: "game_created",
      GameEvolved: "game_evolved",
      CellRevived: "cell_revived",
    } as { [key: string]: string };

    return {
      event,
      eventName: eventNameMap[eventName] ?? eventName,
      parsedStruct,
    };
  });

  return parsedEvents;
}

export async function pullEvents() {
  await prepareContractClasses();

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
  let blockHash: string | null = null; // used to check if the block has changed
  let txHash: string | null = null; // used to check if the transaction has changed
  let txIndex = -1; // used to track the transaction index
  let eventIndex = -1; // used to track the event index

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

    log.info("Pulled events chunk.", {
      continuation_token: eventsChunk?.continuation_token,
      events: eventsChunk.events.length,
    });

    assert(eventsChunk != null, "Events chunk is null.");
    assert(typeof eventsChunk === "object", "Events chunk is not an object.");
    assert(Array.isArray(eventsChunk.events), "Events chunk is not an array.");

    eventsPulled += eventsChunk.events.length;

    if (eventsChunk.events.length > 0) {
      const events = await parseEvents(eventsChunk.events);

      const values: NewEvent[] = events.map(
        ({ event, eventName, parsedStruct }) => {
          if (event.transaction_hash !== txHash) {
            if (event.block_hash !== blockHash) {
              blockHash = event.block_hash;
              txIndex = 0;
            } else {
              txIndex++;
            }

            txHash = event.transaction_hash;
            eventIndex = 0;
          } else {
            eventIndex++;
          }

          const hasBlockNumber = event.block_number != null;

          return {
            txHash: event.transaction_hash as EventTxHash,
            eventIndex: eventIndex as EventEventIndex,
            txFinalityStatus: hasBlockNumber ? "ACCEPTED_ON_L2" : "RECEIVED",
            txExecutionStatus: hasBlockNumber ? "SUCCEEDED" : null,
            blockIndex: event.block_number,
            name: eventName,
            content: parsedStruct,
            txIndex,
            blockHash: event.block_hash,
            updatedAt: new Date(),
            createdAt: new Date(),
          };
        },
      );

      await db
        .insertInto("event")
        .values(values)
        .onConflict((oc) => {
          return oc.columns(["txHash", "eventIndex"]).doUpdateSet((eb) => ({
            txFinalityStatus: eb.ref("excluded.txFinalityStatus"),
            txExecutionStatus: eb.ref("excluded.txExecutionStatus"),
            blockIndex: eb.ref("excluded.blockIndex"),
            name: eb.ref("excluded.name"),
            content: eb.ref("excluded.content"),
            txIndex: eb.ref("excluded.txIndex"),
            blockHash: eb.ref("excluded.blockHash"),
            updatedAt: eb.ref("excluded.updatedAt"),
          }));
        })
        .execute();

      log.info("Inserted events.", { events: eventsChunk.events.length });

      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  } while (eventsChunk.continuation_token);

  if (eventsPulled > 0) {
    await refreshMaterializedViews();
  }
}
