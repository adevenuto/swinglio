import { bigserial, integer, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { leagues } from './leagues';
import { courses } from './courses';

export const rounds = pgTable('rounds', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  leagueId: integer('league_id').notNull().references(() => leagues.id, { onDelete: 'cascade' }),
  courseId: integer('course_id').notNull().references(() => courses.id),
  status: text('status').notNull().default('active'),
  resultsData: jsonb('results_data'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
