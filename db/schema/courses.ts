import { bigserial, doublePrecision, integer, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';
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
  lat: doublePrecision('lat'),
  lng: doublePrecision('lng'),
  phone: varchar('phone', { length: 50 }),
  website: varchar('website', { length: 500 }),
  apiCourseId: integer('api_course_id'),
  enrichedAt: timestamp('enriched_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
