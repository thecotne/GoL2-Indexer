// @generated
// This file is automatically generated by Kanel. Do not modify manually.

import { type EventNetworkName, type EventContractAddress } from './Event';
import { type ColumnType, type Selectable } from 'kysely';

/** Represents the view public.game_current_generation */
export default interface GameCurrentGenerationTable {
  gameGeneration: ColumnType<string, never, never>;

  networkName: ColumnType<EventNetworkName, never, never>;

  contractAddress: ColumnType<EventContractAddress, never, never>;

  gameId: ColumnType<string | null, never, never>;
}

export type GameCurrentGeneration = Selectable<GameCurrentGenerationTable>;
