// @generated
// This file is automatically generated by Kanel. Do not modify manually.

import { type default as SchemaMigrationsTable } from './SchemaMigrations';
import { type default as EventTable } from './Event';
import { type default as TransferEventsTable } from './TransferEvents';
import { type default as BalanceEventsTable } from './BalanceEvents';
import { type default as BalanceTable } from './Balance';
import { type default as GameEventsTable } from './GameEvents';
import { type default as GameStateTable } from './GameState';
import { type default as GameTable } from './Game';

export default interface PublicSchema {
  schema_migrations: SchemaMigrationsTable;

  event: EventTable;

  transfer_events: TransferEventsTable;

  balance_events: BalanceEventsTable;

  balance: BalanceTable;

  game_events: GameEventsTable;

  game_state: GameStateTable;

  game: GameTable;
}
