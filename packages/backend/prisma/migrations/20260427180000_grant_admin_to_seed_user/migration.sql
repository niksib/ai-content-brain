-- Grant admin to a specific seed user. Idempotent: re-running is a no-op
-- since the WHERE clause matches the same row and isAdmin is already true.
-- No-op when the user does not exist (clean dev databases).
UPDATE "User"
SET "isAdmin" = true
WHERE email = 'threads-26386235864332312@postrr.local';
