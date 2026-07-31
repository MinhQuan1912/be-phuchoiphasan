-- Rename `email` column to `username` (preserves existing rows)
ALTER TABLE "Admin" RENAME COLUMN "email" TO "username";

-- Rename the unique index accordingly
ALTER INDEX "Admin_email_key" RENAME TO "Admin_username_key";

-- Set a proper account name for the existing seeded admin (previously an email)
UPDATE "Admin" SET "username" = 'admin' WHERE "username" = 'quan19122002@gmail.com';
