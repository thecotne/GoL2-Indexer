import { contracts, env, log } from "./env";
import { pullEvents } from "./events";

void main();

async function main() {
  log.info("Starting.");

  try {
    while (true) {
      log.info("Pulling events.", contracts);

      for (const { networkName, blockNumber, contractAddress } of contracts) {
        log.info("Pulling events.", {
          networkName,
          blockNumber,
          contractAddress,
        });

        await pullEvents(contractAddress, blockNumber, networkName);
      }

      if (env.INDEXER_DELAY > 0) {
        await new Promise((resolve) => setTimeout(resolve, env.INDEXER_DELAY));
      }
    }
  } catch (e) {
    log.error("App failed.", e);
  }
}
