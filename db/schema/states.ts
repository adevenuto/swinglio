import { bigserial, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';

export const states = pgTable('states', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  abbr: varchar('abbr', { length: 255 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
