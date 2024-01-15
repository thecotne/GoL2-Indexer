// @generated
// This file is automatically generated by Kanel. Do not modify manually.

import { type ColumnType, type Selectable, type Insertable, type Updateable } from 'kysely';

/** Identifier type for public.transaction */
export type TransactionHash = string & { __brand: 'TransactionHash' };

/** Represents the table public.transaction */
export default interface TransactionTable {
  hash: ColumnType<TransactionHash, TransactionHash, TransactionHash>;

  blockHash: ColumnType<string | null, string | null, string | null>;

  status: ColumnType<string, string, string>;

  createdAt: ColumnType<Date, Date | string | undefined, Date | string>;

  updatedAt: ColumnType<Date | null, Date | string | null, Date | string | null>;

  functionName: ColumnType<string, string, string>;

  functionCaller: ColumnType<string, string, string>;

  functionInputCellIndex: ColumnType<number | null, number | null, number | null>;

  functionInputGameState: ColumnType<string | null, string | null, string | null>;

  functionInputGameId: ColumnType<string | null, string | null, string | null>;
}

export type Transaction = Selectable<TransactionTable>;

export type NewTransaction = Insertable<TransactionTable>;

export type TransactionUpdate = Updateable<TransactionTable>;
