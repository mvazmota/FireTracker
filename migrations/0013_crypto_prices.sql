-- Crypto prices come from the same public feed as ETF prices, so the app only
-- has to be told the symbol, the platform, the amount and the date.

create table if not exists "crypto_prices" (
  "symbol"     text not null,
  "date"      text not null,
  "close"     real not null,
  "fetchedAt" text,
  primary key ("symbol", "date")
);
