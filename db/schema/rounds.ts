import { bigserial, date, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { courses } from './courses';
import { profiles } from './profiles';

export const rounds = pgTable('rounds', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  creatorId: uuid('creator_id').notNull().references(() => profiles.id),
  courseId: integer('course_id').notNull().references(() => courses.id),
  teeboxData: jsonb('teebox_data').notNull(),
  status: text('status').notNull().default('active'),
  resultsData: jsonb('results_data'),
  datePlayed: date('date_played'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
