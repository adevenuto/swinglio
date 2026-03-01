import { bigserial, boolean, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { profiles } from './profiles';
import { courses } from './courses';
import { rounds } from './rounds';

export const scores = pgTable('scores', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  golferId: uuid('golfer_id').notNull().references(() => profiles.id),
  roundId: integer('round_id').references(() => rounds.id),
  score: integer('score'),
  scoreDetails: jsonb('score_details'),
  playerStatus: text('player_status').notNull().default('active'),
  selfAttested: boolean('self_attested').notNull().default(false),
  courseId: integer('course_id').references(() => courses.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
