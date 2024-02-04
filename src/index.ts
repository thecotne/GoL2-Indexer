import { log } from "./env";
import { pullEvents } from "./events";
import { updateTransactions } from "./transactions";

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
