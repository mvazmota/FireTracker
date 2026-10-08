-- A third demo account: 28, three years into the app, on EUR 2,200 a month with
-- allowances every six months and a saving rate that swings across the year.
--
-- Password 1234, hashed with Better Auth's own hasher. Only the account rows
-- live here; the history comes from the persona in src/lib/demo/personas.js the
-- first time the account is opened.

insert or ignore into "user" ("id", "name", "email", "emailVerified", "image", "createdAt", "updatedAt")
values (
  'demo-diogo-user',
  'Diogo',
  'diogo@email.com',
  1,
  null,
  '2026-01-01T00:00:00.000Z',
  '2026-01-01T00:00:00.000Z'
);

insert or ignore into "account" ("id", "accountId", "providerId", "userId", "password", "createdAt", "updatedAt")
values (
  'demo-diogo-account',
  'demo-diogo-user',
  'credential',
  'demo-diogo-user',
  '011d8584d50f6687fa12cc0623854443:2cb16588e5177f9808e016299bc1e10881712e1d82b1e0ae360e2c527ca921ab644ed5e17f1671aec510cbe67fa1d092b4d0e9a1a739c4fab854e56c5eb21bd6',
  '2026-01-01T00:00:00.000Z',
  '2026-01-01T00:00:00.000Z'
);
