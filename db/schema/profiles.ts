import { date, doublePrecision, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(),
  firstName: varchar('first_name'),
  lastName: varchar('last_name'),
  displayName: varchar('display_name'),
  avatarUrl: varchar('avatar_url'),
  coverUrl: varchar('cover_url'),
  email: varchar('email'),
  birthday: date('birthday'),
  gender: varchar('gender', { length: 20 }),
  role: varchar('role', { length: 50 }).default('user'),
  subscriptionTier: varchar('subscription_tier', { length: 20 }).default('free'),
  handicapIndex: doublePrecision('handicap_index'),
  handicapUpdatedAt: timestamp('handicap_updated_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
