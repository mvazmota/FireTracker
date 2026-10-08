-- The annual cost is typed by the user, and a catalog row can exist with
-- nothing but an ISIN behind it, so the symbol is no longer required.

create table "etf_catalog_new" (
  "isin"          text primary key,
  "symbol"        text,
  "name"          text,
  "currency"      text,
  "exchange"      text,
  "fetchedAt"     text,
  "issuer"        text,
  "fundSize"      real,
  "dividendYield" real,
  "inception"     text,
  "ter"           real,
  "distribution"  text
);

insert into "etf_catalog_new" (
  "isin", "symbol", "name", "currency", "exchange", "fetchedAt",
  "issuer", "fundSize", "dividendYield", "inception", "ter", "distribution"
)
select
  "isin", "symbol", "name", "currency", "exchange", "fetchedAt",
  "issuer", "fundSize", "dividendYield", "inception", "ter", "distribution"
from "etf_catalog";

drop table "etf_catalog";
alter table "etf_catalog_new" rename to "etf_catalog";
