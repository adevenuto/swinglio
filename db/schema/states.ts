import { bigserial, integer, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';
import { countries } from './countries';

export const states = pgTable('states', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  abbr: varchar('abbr', { length: 255 }).notNull(),
  countryId: integer('country_id').references(() => countries.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
