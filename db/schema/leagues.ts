import { bigserial, integer, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { courses } from './courses';

export const leagues = pgTable('leagues', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  name: varchar('name', { length: 255 }),
  ownerId: uuid('owner_id').notNull(),
  courseId: integer('course_id').notNull().references(() => courses.id),
  teeboxData: jsonb('teebox_data').notNull(),
  gameConfig: jsonb('game_config'),
  playDay: text('play_day'),
  playTime: text('play_time'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
