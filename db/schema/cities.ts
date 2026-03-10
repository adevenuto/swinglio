import { bigserial, integer, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';
import { states } from './states';

export const cities = pgTable('cities', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  stateId: integer('state_id').notNull().references(() => states.id),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
