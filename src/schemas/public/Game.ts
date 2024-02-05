// @generated
// This file is automatically generated by Kanel. Do not modify manually.

import { type ColumnType, type Selectable } from 'kysely';

/** Represents the view public.game */
export default interface GameTable {
  gameId: ColumnType<string, never, never>;

  gameGeneration: ColumnType<string, never, never>;

  gameState: ColumnType<string, never, never>;

  gameOver: ColumnType<boolean, never, never>;

  revivedCells: ColumnType<unknown, never, never>;
}

export type Game = Selectable<GameTable>;
