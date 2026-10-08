-- The user's FIRE plan: strategy, withdrawal rate, retirement spending target,
-- expected post-FIRE income and the assumed real return. One JSON blob, because
-- the plan is always read and written whole.

alter table "user_settings" add column "firePlan" text;
