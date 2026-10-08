-- The FIRE answers captured during onboarding (yearly income, average yearly
-- spending and the share of income saved). They seed the first FIRE goal and
-- let the FIRE page show what the user expected alongside what their records
-- actually show.

alter table "user_settings" add column "fireEstimate" text;
