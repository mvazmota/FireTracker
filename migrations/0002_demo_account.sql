-- Permanent demo account: demo@email.com / 1234 (display name "Demo").
--
-- The password is stored as a Better Auth scrypt hash, generated with its own
-- hasher (scripts/hash-password.mjs), so seeding a 4-character password does not
-- weaken the minimum length enforced on real sign-ups. `insert or ignore` keeps
-- this migration safe to re-run and never overwrites a live account.

insert or ignore into "user" ("id", "name", "email", "emailVerified", "image", "createdAt", "updatedAt")
values (
  'demo-firepath-user',
  'Demo',
  'demo@email.com',
  1,
  null,
  '2026-01-01T00:00:00.000Z',
  '2026-01-01T00:00:00.000Z'
);

insert or ignore into "account" ("id", "accountId", "providerId", "userId", "password", "createdAt", "updatedAt")
values (
  'demo-firepath-account',
  'demo-firepath-user',
  'credential',
  'demo-firepath-user',
  '108e74e49f3db430dba8c4baab85d099:f678f6eec75f32290a99e9a1705c7874956999db41c860487d753261833560d8e23d5e2dfd922c10d1407f50169b8b81f35b66abe09d6aff5c230ad31ab03b8b',
  '2026-01-01T00:00:00.000Z',
  '2026-01-01T00:00:00.000Z'
);
