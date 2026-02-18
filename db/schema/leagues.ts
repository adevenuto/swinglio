import { bigserial, integer, jsonb, pgTable, timestamp } from 'drizzle-orm/pg-core';
import { courses } from './courses';

export const leagues = pgTable('leagues', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  courseId: integer('course_id').notNull().references(() => courses.id),
  teeboxData: jsonb('teebox_data').notNull(),
  gameConfig: jsonb('game_config'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
