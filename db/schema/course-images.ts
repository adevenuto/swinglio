import { bigserial, boolean, integer, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { courses } from './courses';
import { profiles } from './profiles';

export const courseImages = pgTable('course_images', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  courseId: integer('course_id').notNull().references(() => courses.id),
  imageUrl: varchar('image_url', { length: 500 }).notNull(),
  isFeatured: boolean('is_featured').default(false),
  sortOrder: integer('sort_order').default(0),
  uploadedBy: uuid('uploaded_by').references(() => profiles.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
