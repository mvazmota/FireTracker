-- Fund facts beyond the price: who runs it, how big it is, what it charges and
-- whether it pays anything out. Fetched once per ISIN and cached alongside the
-- listing.

alter table "etf_catalog" add column "issuer" text;
alter table "etf_catalog" add column "fundSize" real;
alter table "etf_catalog" add column "dividendYield" real;
alter table "etf_catalog" add column "inception" text;
alter table "etf_catalog" add column "ter" real;
alter table "etf_catalog" add column "distribution" text;
