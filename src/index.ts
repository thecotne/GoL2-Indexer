import { contracts, log } from "./env";
import { pullEvents } from "./events";

void main();

async function main() {
  log.info("Starting.");

  try {
    while (true) {
      log.info("Pulling events.", contracts);

      for (const { networkName, blockNumber, contractAddress } of contracts) {
        log.info("Pulling events.", { networkName, blockNumber, contractAddress });

        await pullEvents(contractAddress, blockNumber, networkName);
      }

      // await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  } catch (e) {
    log.error("App failed.", e);
  }
}
