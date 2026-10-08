-- A second demo account: a 22-year-old one year into adult life in Portugal,
-- earning EUR 2,000 a month and investing EUR 200 of it.
--
-- Password 1234, like the original demo, hashed with Better Auth's own hasher
-- (scripts/hash-password.mjs) so seeding a short password does not weaken the
-- minimum length enforced on real sign-ups.
--
-- Only the account rows live here. The history is generated the first time the
-- account is opened, from the persona in src/lib/demo/personas.js.

insert or ignore into "user" ("id", "name", "email", "emailVerified", "image", "createdAt", "updatedAt")
values (
  'demo-tiago-user',
  'Tiago',
  'tiago@email.com',
  1,
  null,
  '2026-01-01T00:00:00.000Z',
  '2026-01-01T00:00:00.000Z'
);

insert or ignore into "account" ("id", "accountId", "providerId", "userId", "password", "createdAt", "updatedAt")
values (
  'demo-tiago-account',
  'demo-tiago-user',
  'credential',
  'demo-tiago-user',
  '9e369138412b1f8a3cf3621cb78c3585:a94d67aa0bb905ee96ce0b21389758784b782125adc4c8997a6f1f2bc5086744f462ec0743d931ddf72132fa1ede869e706d6c59d59390736f01cef7dbde1494',
  '2026-01-01T00:00:00.000Z',
  '2026-01-01T00:00:00.000Z'
);
