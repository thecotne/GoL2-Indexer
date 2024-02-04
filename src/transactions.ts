import { db, log, starknet } from "./env";
import { refreshMaterializedViews } from "./views";

export async function updateTransactions() {
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
