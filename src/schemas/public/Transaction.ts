// @generated
// This file is automatically generated by Kanel. Do not modify manually.

/** Identifier type for public.transaction */
export type TransactionHash = string & { __brand: 'TransactionHash' };

/** Represents the table public.transaction */
export default interface Transaction {
  hash: TransactionHash;

  errorContent: unknown | null;

  blockHash: string | null;

  status: string;

  createdAt: Date;

  updatedAt: Date | null;

  functionName: string;

  functionCaller: string;

  functionInputCellIndex: number | null;

  functionInputGameState: string | null;

  functionInputGameId: string | null;
}

/** Represents the initializer for the table public.transaction */
export interface TransactionInitializer {
  hash: TransactionHash;

  errorContent?: unknown | null;

  blockHash?: string | null;

  status: string;

  /** Default value: now() */
  createdAt?: Date;

  updatedAt?: Date | null;

  functionName: string;

  functionCaller: string;

  functionInputCellIndex?: number | null;

  functionInputGameState?: string | null;

  functionInputGameId?: string | null;
}

/** Represents the mutator for the table public.transaction */
export interface TransactionMutator {
  hash?: TransactionHash;

  errorContent?: unknown | null;

  blockHash?: string | null;

  status?: string;

  createdAt?: Date;

  updatedAt?: Date | null;

  functionName?: string;

  functionCaller?: string;

  functionInputCellIndex?: number | null;

  functionInputGameState?: string | null;

  functionInputGameId?: string | null;
}