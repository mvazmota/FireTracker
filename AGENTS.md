# AGENTS.md

Firepath tracks monthly income, expenses and investments and projects when the
user reaches financial independence (FIRE). A single Cloudflare Worker serves
both the built React SPA and the `/api/*` routes. Per-user data lives in D1;
accounts and sessions are handled by Better Auth.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server for the SPA |
| `npm run dev:worker` | `wrangler dev` — the API and a local D1 |
| `npm test` | Vitest, once |
| `npm run build` | Production build into `dist/` |
| `npm run db:migrate:local` | Apply `migrations/` to the local D1 |
| `npm run db:migrate:remote` | Apply `migrations/` to production D1 |
| `npm run auth:generate` | Regenerate `worker/db/auth-schema.sql` |

**There is no lint or format script.** Match the surrounding style by hand.

In development run the two servers together, and run Vite on **port 5199**
(`npm run dev -- --port 5199`). That origin is the one listed in
`TRUSTED_ORIGINS`, so auth rejects the default 5173. The Worker must be on
**8787**, because `vite.config.js` proxies `/api` to `http://127.0.0.1:8787`.

## Architecture

- `worker/index.js` — the Hono app. `/api/auth/*` goes to Better Auth,
  `/api/*` to `worker/routes.js`.
- Static assets are served from `dist/` through the `assets` binding, with
  `not_found_handling: "single-page-application"`. `run_worker_first:
  ["/api/*"]` exists because that SPA fallback would otherwise answer API calls
  with `index.html`.
- `createAuth(env)` builds a Better Auth instance **per request**. The D1
  binding lives on `env`, so it must never become a module-level singleton.
- `worker/tables.js` maps client object shapes onto D1 columns. When you add a
  column, update its `columns`/`toRow`/`fromRow` entry *and* the matching
  client shape.
- Client state is a chain of providers composed in `src/app/AppProviders.jsx`,
  where **order matters**: `AuthProvider` (session), `SyncProvider` (save status
  and retry), `DataProvider` (loads `GET /api/state` and owns it), then
  `SettingsProvider` (profile, FIRE goal, visibility, platforms, categories) and
  `FinanceProvider` (transactions, assets, every mutation) on top.

## Rules that are not obvious from the code

- **Money is stored as REAL euros, not integer cents.** Round *totals* at the
  boundaries — `roundMoney` on the client, `roundCents` in the Worker.
  `MONEY_COLUMNS` in `worker/tables.js` lists which columns are totals.
  Per-unit prices (`averageCost`, `currentPrice`) and quantities (`units`) are
  excluded deliberately: they need more than two decimals.
- **The FIRE number comes from the user's plan, not from a fixed 4%.**
  `user_settings.firePlan` holds the strategy, withdrawal rate, retirement
  spending target, expected post-FIRE income and assumed real return. The pot
  only has to cover what the post-FIRE income leaves uncovered, so
  `spendingToCover` — not `expenses` — is what feeds `fireTarget`. `normalizePlan`
  guards every stored value, so the maths never sees a nonsense rate. The
  defaults (`WITHDRAWAL_RATE = 0.04`, `REAL_RETURN = 0.05`) reproduce the plain
  4% rule.
- **The plan owns the goal.** There is no separate goal to set: `projection.target`
  *is* the goal. `useFireProjection(currentPosition)` is the single place it is
  computed, so the FIRE tab and the sidebar meter cannot disagree about it. The
  `user_settings.fireGoal` column still exists in the database but nothing reads
  or writes it — do not reintroduce it.
- **The FIRE plan is edited on the FIRE tab**, not in settings. The draft feeds
  `useFireProjection(currentPosition, plan)` so every figure follows each
  keystroke, and it is written on blur rather than by a Save button. Profile &
  settings keeps only the sidebar-meter toggle.
- **The FIRE horizon is a simulation, not a single date.** `projectionRange` runs
  the plan many times with the returns shuffled and reports the spread and the
  odds of making the plan's own date. The generator is seeded, so a given plan
  always produces the same range — do not swap in `Math.random`, or the numbers
  will jitter on every render. `projectSeries` is the deterministic expected case
  and both are shown on purpose: the line is the plan, the band is reality.
- **Feedback is consequences, not advice.** `fireLevers` and
  `spendingByCategory` exist to show what the user's own figures imply — what a
  habit is worth in months, what a category costs in pot terms, which spending
  recurs. Nothing here recommends an investment, a category to cut or a target
  to aim for, and that is deliberate: the app is a mirror. Keep it that way.
- **FIRE maths** (`src/lib/fire.js`): the annual average divides by the number of
  months that **contain transactions**, not months elapsed — elapsed months
  understate spending and flatter the FIRE date. Transfers into investments or
  savings count as saving, not spending, because the rule only has to cover
  living costs.
- **The FIRE projection reports the position it started from** as
  `projection.current`. Screens that show FIRE progress should read that rather
  than reaching for the tracked position directly.
- **The net worth asked for during onboarding is never stored.** It exists only
  to sketch the projected timeline in the calculator. The FIRE tab projects from
  tracked data alone, so a brand-new account's tab is deliberately more
  conservative than the preview it saw during onboarding.
- **Recurring transactions are generated on the client, lazily, on app load** —
  there is no cron. Occurrence ids are deterministic
  (`recurring-<ruleId>-<month>`) so generation is idempotent, and
  `lastGeneratedMonth` stops a deleted occurrence from reappearing. A new rule
  is never back-dated (`startMonthFor`).
- **`PUT /api/settings` merges field by field** (`body?.settings?.x ??
  existing?.x`). A `null` therefore cannot clear a stored field — it falls
  through to the existing value.
- **Categories and platforms are per-user.** A new account starts with none and
  onboarding seeds them. A category that has transactions cannot be deleted.
- **Sign-in is by email**, not username (Better Auth).

## Conventions

- Every user-facing string lives in `src/i18n/messages.jsx` in **both** `en` and
  `pt`. Never hardcode copy in a component.
- Every media query goes in `src/styles/responsive.css`, which is imported last.
- Relative imports include the file extension (`./foo.js`).
- The React Compiler is enabled in `vite.config.js`.
- Unit tests sit next to the code as `*.test.js` and cover the pure helpers in
  `src/lib` and `src/data` only. The environment is Node — there is no DOM and
  no component-test setup.

## Gotchas

- Vite intermittently serves **stale modules** after an edit: a change looks
  broken while the file on disk and `npm run build` are both correct. Restart
  the dev server and reload before debugging further.
- **A coarse `step` on a number input silently blocks form submission.** HTML
  constraint validation rejects the whole form when a value is not a multiple of
  `step`, so `onSubmit` never runs and nothing is saved — with no error shown.
  Use `step="any"` (or 0.01 for money) on any input inside a form.
- Stale `wrangler`/`workerd` processes keep port 8787 alive and make the next
  `wrangler dev` fail to bind. Kill them before restarting the Worker.
- `npm run db:migrate:remote` occasionally fails with a transient
  `403` / `code: 7403`. It is not a permissions problem — retry it.
- `.dev.vars` (gitignored) holds local secrets; remote ones are set with
  `wrangler secret put`. `BETTER_AUTH_SECRET` is required. `RESEND_API_KEY` is
  optional — without it the password-reset link is written to the Worker log
  instead of emailed, which is how that flow is exercised locally.

## Deploying

**Pushing to `main` is the deploy.** Cloudflare's Git integration builds and
deploys the Worker; there is no separate step. `npm run deploy` exists but is
not the normal path.

**Apply remote migrations before pushing.** The Worker's SQL names the columns
those migrations add, so a Worker deployed against an unmigrated database
returns 500s on the affected routes. The order is safe the other way round,
because an additive migration is harmless to the already-running Worker:

```sh
npm run db:migrate:remote
git push origin main
```

## Boundaries

- Do not push or deploy unless explicitly asked.
- **Demo accounts are described, not scripted.** `src/lib/demo/personas.js` holds
  each one as plain data — income, expense lines, investments — and
  `src/lib/demo/build.js` turns it into transactions and holdings. Adding a demo
  account means describing a person, not writing another generator. The account
  rows come from a migration; the data is generated the first time the account
  is opened. Everything varying is seeded rather than random, so a persona always
  produces the same history. A persona's income lines either recur — seeded as a
  *recurring rule* plus its past occurrences, so the app's own generator keeps
  paying it — or land in chosen months, which is how allowances and bonuses
  work and how an investment can take a share of one. An opening balance is an
  income dated before the tracked history, which counts as cash without being
  read as income by the FIRE averages. The app has no real opening-balance
  field; that would be the better fix.
- Do not delete a demo account (`demo@email.com`, `tiago@email.com`,
  `diogo@email.com`). Migrations create them and `DataProvider` fills them; the
  live demo depends on them.
- Do not hand-edit `worker/db/auth-schema.sql`; regenerate it.
- Do not remove the guard that blocks deleting a category in use.
- Do not convert money to integer cents.
- Keep `npm test` and `npm run build` passing before committing.
