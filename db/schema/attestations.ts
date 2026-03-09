import { bigserial, integer, pgTable, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { rounds } from './rounds';
import { profiles } from './profiles';

export const attestations = pgTable('attestations', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  roundId: integer('round_id').notNull().references(() => rounds.id),
  attesterId: uuid('attester_id').references(() => profiles.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  unique('attestations_round_attester_unique').on(table.roundId, table.attesterId),
]);
