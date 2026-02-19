import { bigserial, integer, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { leagues } from './leagues';
import { profiles } from './profiles';

export const leagueUsers = pgTable('league_users', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  leagueId: integer('league_id').notNull().references(() => leagues.id, { onDelete: 'cascade' }),
  golferId: uuid('golfer_id').notNull().references(() => profiles.id),
  phone: varchar('phone', { length: 20 }),
  role: text('role').notNull().default('member'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
