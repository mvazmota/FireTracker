-- Categories and platforms become per-user data, chosen during onboarding.
--
-- Previously the transaction categories were a global built-in list and
-- `customCategories` held only the extras. Now `categories` holds every
-- category the user picked, and `onboarded` records that they finished the
-- setup step. Fresh accounts therefore start with no categories and no
-- platforms, and are sent through onboarding.

ALTER TABLE "user_settings" ADD COLUMN "categories" text;
ALTER TABLE "user_settings" ADD COLUMN "onboarded" integer;
ALTER TABLE "user_settings" DROP COLUMN "customCategories";

-- The shared demo account predates onboarding: give it the full catalogue and
-- mark it as set up so it skips the flow.
UPDATE "user_settings"
SET
  "onboarded" = 1,
  "categories" = '{"expense":["Food & dining","Investment","Savings","Transport","Shopping","Housing","Health","Entertainment","Other"],"income":["Salary","Freelance","Gift","Other"]}'
WHERE "userId" = 'demo-firepath-user';
