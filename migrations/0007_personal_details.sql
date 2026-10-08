-- Optional personal details, both left empty until the user provides them.
--
-- The country will drive expected tax, the state retirement age and pension
-- assumptions; the birth year is what turns a FIRE horizon into the age the
-- user will be when they get there.

alter table "user_settings" add column "birthYear" integer;
alter table "user_settings" add column "country" text;
