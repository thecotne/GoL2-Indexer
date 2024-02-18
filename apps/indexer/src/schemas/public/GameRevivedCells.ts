// @generated
// This file is automatically generated by Kanel. Do not modify manually.

import { type EventNetworkName, type EventContractAddress } from './Event';
import { type ColumnType, type Selectable } from 'kysely';

/** Represents the view public.game_revived_cells */
export default interface GameRevivedCellsTable {
  networkName: ColumnType<EventNetworkName, never, never>;

  contractAddress: ColumnType<EventContractAddress, never, never>;

  gameGeneration: ColumnType<string | null, never, never>;

  revivedCellIndexes: ColumnType<string[], never, never>;

  revivedCellOwners: ColumnType<string[], never, never>;
}

export type GameRevivedCells = Selectable<GameRevivedCellsTable>;