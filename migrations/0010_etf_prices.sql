-- ETF prices come from a public feed, so the app only has to be told the ISIN,
-- the platform, the amount and the date.

-- ISIN -> the listing we price it from. One ISIN trades on many exchanges in
-- many currencies; we keep the euro one, so this is a cache of that decision.
create table if not exists "etf_catalog" (
  "isin"      text primary key,
  "symbol"    text not null,
  "name"      text,
  "currency"  text,
  "exchange"  text,
  "fetchedAt" text
);

-- Daily closes, from the day the user bought it onwards.
create table if not exists "etf_prices" (
  "symbol"    text not null,
  "date"      text not null,
  "close"     real not null,
  "fetchedAt" text,
  primary key ("symbol", "date")
);

-- Which fund a holding is, so its prices can be refreshed later.
alter table "etfs" add column "isin" text;
