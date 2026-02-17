import { bigserial, integer, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { cities } from './cities';
import { states } from './states';

export const courses = pgTable('courses', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  cityId: integer('city_id').notNull().references(() => cities.id),
  stateId: integer('state_id').notNull().references(() => states.id),
  name: varchar('name', { length: 255 }).notNull(),
  street: varchar('street', { length: 255 }),
  state: varchar('state', { length: 255 }),
  postalCode: varchar('postal_code', { length: 255 }),
  layoutData: text('layout_data'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
