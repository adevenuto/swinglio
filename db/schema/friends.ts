import { bigserial, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { profiles } from './profiles';

export const friends = pgTable('friends', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  requesterId: uuid('requester_id').notNull().references(() => profiles.id),
  recipientId: uuid('recipient_id').notNull().references(() => profiles.id),
  status: text('status').notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
