-- The current quote, which moves while the closes behind it never do. Kept
-- apart from them so a stale price can never be served as a fresh one.

create table if not exists "crypto_market" (
  "symbol"        text primary key,
  "price"        real,
  "changePercent" real,
  "high52"       real,
  "low52"        real,
  "fetchedAt"    text
);
