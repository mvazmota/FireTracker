-- Recurring transaction rules (salary, rent, bills).
--
-- The rules are templates; the transactions they produce are ordinary rows in
-- "transactions" with a deterministic id of `recurring-<ruleId>-<month>`, which
-- makes generation idempotent. `lastGeneratedMonth` records how far a rule has
-- been materialised so a deleted occurrence is not silently recreated.

create table "recurring_rules" (
  "id" text not null primary key,
  "userId" text not null references "user" ("id") on delete cascade,
  "title" text not null,
  "category" text not null,
  "type" text not null check ("type" in ('income', 'expense')),
  "amount" real not null,
  "platform" text,
  "dayOfMonth" integer not null,
  "startMonth" text not null,
  "lastGeneratedMonth" text,
  "active" integer not null default 1
);

create index "recurring_user_idx" on "recurring_rules" ("userId");
