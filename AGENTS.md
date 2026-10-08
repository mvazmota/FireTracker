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
- Client state is two providers, both hydrated from `GET /api/state`:
  `SettingsProvider` (profile, FIRE goal, visibility, platforms, categories) and
  `FinanceProvider` (transactions, assets, every mutation).

## Rules that are not obvious from the code

- **Money is stored as REAL euros, not integer cents.** Round *totals* at the
  boundaries — `roundMoney` on the client, `roundCents` in the Worker.
  `MONEY_COLUMNS` in `worker/tables.js` lists which columns are totals.
  Per-unit prices (`averageCost`, `currentPrice`) and quantities (`units`) are
  excluded deliberately: they need more than two decimals.
- **FIRE maths** (`src/lib/fire.js`): `WITHDRAWAL_RATE = 0.04`,
  `REAL_RETURN = 0.05`. The annual average divides by the number of months that
  **contain transactions**, not months elapsed — elapsed months understate
  spending and flatter the FIRE date. Transfers into investments or savings
  count as saving, not spending, because the 4% rule only covers living costs.
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
- Do not delete the demo account (`demo@email.com`, seeded by
  `0002_demo_account.sql`). The live demo depends on it. Its password is `1234`
  and is public by design.
- Do not hand-edit `worker/db/auth-schema.sql`; regenerate it.
- Do not remove the guard that blocks deleting a category in use.
- Do not convert money to integer cents.
- Keep `npm test` and `npm run build` passing before committing.
