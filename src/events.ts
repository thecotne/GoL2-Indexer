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
  BigNumberish,
  Uint256,
} from "starknet";
import { db, env, log, starknet } from "./env";
import {
  EventEventIndex,
  EventTransactionHash,
  NewEvent,
} from "./schemas/public/Event";

// --- contract classes ---
const contractClasses: Map<string, ContractClassResponse> = new Map();

async function prepareContractClasses() {
  await prepareContractClass(
    await starknet.getClassHashAt(
      env.CONTRACT_ADDRESS,
      env.CONTRACT_BLOCK_NUMBER
    )
  );

  await prepareContractClass(
    await starknet.getClassHashAt(env.CONTRACT_ADDRESS, "latest")
  );

  const upgradeEvents = await db
    .selectFrom("event")
    .selectAll()
    .where("event.eventName", "=", "Upgraded")
    .execute();

  for (const upgradeEvent of upgradeEvents) {
    const implementation = num.toHex(
      (upgradeEvent.eventData as { implementation: string }).implementation
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
          CallData.getAbiEnum(legacyFormatAbi)
        )
        .at(0);

      if (parsedEvent) return parsedEvent;
    } catch {}
  }

  log.info("Failed to parse event.", { event });

  throw new Error("Failed to parse event.");
}
// type BigNumberish = string | number | bigint;
// interface Uint256 {
//   low: BigNumberish;
//   high: BigNumberish;
// }
// type ParsedStruct = {
//   [key: string]: BigNumberish | BigNumberish[] | ParsedStruct | Uint256;
// };

function isUint256(value: object): value is Uint256 {
  return (
    "low" in value &&
    (typeof value.low === "bigint" ||
      typeof value.low === "string" ||
      typeof value.low === "number") &&
    "high" in value &&
    (typeof value.high === "bigint" ||
      typeof value.high === "string" ||
      typeof value.high === "number") &&
    Object.keys(value).length === 2
  );
}

type ParsedStructBigInt = {
  [key: string]: bigint | bigint[] | ParsedStructBigInt;
};

function parsedStructToBigInt(parsedStruct: ParsedStruct): ParsedStructBigInt {
  return Object.fromEntries(
    Object.entries(parsedStruct).map(([key, value]) => {
      if (Array.isArray(value)) {
        return [key, value.map((v) => BigInt(v))];
      }

      if (typeof value === "object") {
        if (isUint256(value)) {
          return [
            key,
            uint256.uint256ToBN({
              low: value.low,
              high: value.high,
            }),
          ];
        }

        return [key, parsedStructToBigInt(value as ParsedStruct)];
      }

      return [key, BigInt(value)];
    })
  );
}

type ParsedStructJSON = {
  [key: string]: (string | number) | (string | number)[] | ParsedStructJSON;
};

function parsedStructToJSON(
  parsedStruct: ParsedStructBigInt
): ParsedStructJSON {
  return Object.fromEntries(
    Object.entries(parsedStruct).map(([key, value]) => {
      if (Array.isArray(value)) {
        return [key, value.map((v) => v.toString())];
      }

      if (typeof value === "object") {
        if (isUint256(value)) {
          return [
            key,
            uint256
              .uint256ToBN({
                low: value.low,
                high: value.high,
              })
              .toString(),
          ];
        }

        return [key, parsedStructToJSON(value as ParsedStructBigInt)];
      }

      return [key, value.toString()];
    })
  );
}

interface ParsedEventObject<E extends Event> {
  eventName: string;
  parsedStruct: ParsedStructJSON;
  event: E;
}

async function parseEvents<E extends Event>(
  events: Array<E>
): Promise<Array<ParsedEventObject<E>>> {
  for (const event of events) {
    if (event.keys[0] === hash.getSelectorFromName("Upgraded")) {
      await prepareContractClass(num.toHex(event.data[0]));
    }
  }

  const parsedEvents = events.map((event) => {
    const parsedEvent = parseEvent(event);

    const [eventName] = Object.keys(parsedEvent);
    const parsedStruct = parsedStructToBigInt(parsedEvent[eventName]);
    const parsedStructJSON = parsedStructToJSON(parsedStruct);

    if ("from_" in parsedStructJSON) {
      parsedStructJSON.from = parsedStructJSON.from_;

      // biome-ignore lint/performance/noDelete: Need to delete the key
      delete parsedStructJSON.from_;
    }

    if ("game_id" in parsedStruct && typeof parsedStruct.game_id === "bigint") {
      parsedStructJSON.game_id = num.toHex(parsedStruct.game_id);
    }

    if ("from" in parsedStructJSON && typeof parsedStructJSON.from === "string") {
      parsedStructJSON.from = num.toHex(parsedStructJSON.from);
    }

    if ("to" in parsedStructJSON && typeof parsedStructJSON.to === "string") {
      parsedStructJSON.to = num.toHex(parsedStructJSON.to);
    }

    if ("user_id" in parsedStructJSON && typeof parsedStructJSON.user_id === "string") {
      parsedStructJSON.user_id = num.toHex(parsedStructJSON.user_id);
    }

    const eventNameMap = {
      game_created: "GameCreated",
      game_evolved: "GameEvolved",
      cell_revived: "CellRevived",
    } as { [key: string]: string };

    return {
      event,
      eventName: eventNameMap[eventName] ?? eventName,
      parsedStruct: parsedStructJSON,
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
      : env.CONTRACT_BLOCK_NUMBER
  );

  let eventsChunk: Awaited<ReturnType<typeof starknet.getEvents>> | undefined;
  let blockHash: string | null = null; // used to check if the block has changed
  let txHash: string | null = null; // used to check if the transaction has changed
  let transactionIndex = -1; // used to track the transaction index
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

    if (eventsChunk.events.length > 0) {
      const events = await parseEvents(eventsChunk.events);

      await db
        .insertInto("event")
        .values(
          events.map(({ event, eventName, parsedStruct }) => {
            if (event.transaction_hash !== txHash) {
              if (event.block_hash !== blockHash) {
                blockHash = event.block_hash;
                transactionIndex = 0;
              } else {
                transactionIndex++;
              }

              txHash = event.transaction_hash;
              eventIndex = 0;
            } else {
              eventIndex++;
            }

            return {
              transactionHash: event.transaction_hash as EventTransactionHash,
              transactionIndex,

              blockIndex: event.block_number,
              blockHash: event.block_hash,

              eventIndex: eventIndex as EventEventIndex,

              eventName,
              eventData: parsedStruct,
            } satisfies NewEvent;
          })
        )
        .onConflict((oc) => {
          return oc
            .columns(["transactionHash", "eventIndex"])
            .doUpdateSet((eb) => ({
              blockIndex: eb.ref("excluded.blockIndex"),
              eventName: eb.ref("excluded.eventName"),
              eventData: eb.ref("excluded.eventData"),
              transactionIndex: eb.ref("excluded.transactionIndex"),
              blockHash: eb.ref("excluded.blockHash"),
              updatedAt: eb.ref("excluded.updatedAt"),
            }));
        })
        .execute();

      log.info("Inserted events.", { events: eventsChunk.events.length });

      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  } while (eventsChunk.continuation_token);
}
