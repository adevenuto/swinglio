import { bigserial, integer, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { profiles } from './profiles';
import { courses } from './courses';

export const scores = pgTable('scores', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  golferId: uuid('golfer_id').notNull().references(() => profiles.id),
  score: integer('score'),
  courseId: integer('course_id').references(() => courses.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
