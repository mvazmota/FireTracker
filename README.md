# Firepath

A personal finance tracker for monthly income, expenses and investments, with a
FIRE tab that projects when you reach financial independence using the 4% rule.

Accounts are real and per-user. A single Cloudflare Worker serves the React app
and the API, and each account's data lives in its own rows in a Cloudflare D1
database. The app is bilingual (English and European Portuguese) and works in
euros.

## Features

- **Transactions** — income and expenses with a category, platform, note and a
  full timestamp, in a filterable and searchable history.
- **Recurring transactions** — monthly rules for salary, rent and bills that
  generate their own occurrences once their day comes around.
- **Investments** — ETFs, crypto, P2P lending, bonds and savings accounts, each
  with its own screen, cost basis and value history. Any type can be hidden
  without deleting its data.
- **Global position** — tracked cash plus every asset, charted over 3, 6, 12,
  24 months or all recorded history.
- **Statistics** — annual cash flow, spending by category and investment
  allocation.
- **FIRE tab** — your plan and its projections in one place. Pick a strategy
  (traditional, lean, fat, semi-retired or custom) and tune the withdrawal rate,
  retirement spending, post-FIRE income and assumed real return; the number,
  horizon and chart follow as you type.
- **Onboarding** — a five-step first run that opens with a FIRE calculator and
  sets your starting number, then seeds your categories, platforms and
  investment types.
- **Profile** — display name, avatar, language, FIRE goal, per-type visibility
  and account deletion.

## Stack

- React 19 with the React Compiler, built by Vite.
- A Hono Worker on Cloudflare serving the built SPA and the `/api/*` routes.
- Cloudflare D1 for storage.
- Better Auth for email and password accounts.
- Vitest for the unit tests.

## Running locally

Requires Node 22 (`nvm use`) and a Cloudflare account for `wrangler`.

```sh
npm install
```

Create a `.dev.vars` file in the project root (it is gitignored):

```sh
BETTER_AUTH_SECRET=any-long-random-string

# Optional. Without it, password-reset links are written to the Worker log
# instead of being emailed.
RESEND_API_KEY=
```

Apply the migrations to the local D1, then run both servers:

```sh
npm run db:migrate:local

npm run dev:worker            # the API, on http://127.0.0.1:8787
npm run dev -- --port 5199    # the app, on http://127.0.0.1:5199
```

Open <http://127.0.0.1:5199>. Vite proxies `/api` to the Worker, so the two are
same-origin in development exactly as they are in production. Port 5199 is the
one listed in `TRUSTED_ORIGINS`, so auth rejects the Vite default of 5173.

Sign in to one of the demo accounts, or create your own. New accounts start
empty and walk through onboarding; a demo account is filled with its persona's
history the first time it is opened.

| Email | Password | Who |
| --- | --- | --- |
| `demo@email.com` | `1234` | Three years of history with every asset type in play |
| `tiago@email.com` | `1234` | 22 and one year into adult life in Portugal: €2,000 a month, €200 of it into an S&P 500 ETF |

## Project structure

```
src/
  main.jsx, App.jsx          entry point, app shell and page routing
  app/AppProviders.jsx       composes the provider chain (order matters)
  components/
    auth/                    sign in, sign up, password reset
    onboarding/              the five-step first-run setup
    overview, position, statistics, transactions, recurring,
    investments, fire, charts, profile, ui
                             the screens, modals, charts and shared bits
  context/                   auth, sync, data, settings and finance providers
  hooks/                     usePortfolioSummary
  i18n/                      EN and PT copy, plus the language provider
  lib/                       pure helpers: money, dates, format, portfolio,
                             fire, recurring, simulation, timeline, api
  data/                      built-in categories and investment types
  styles/                    base, layout, components, features, auth,
                             responsive (loaded last)
worker/
  index.js                   the Hono app
  auth.js                    Better Auth configuration
  routes.js, tables.js       the API routes and the D1 column mappings
  email.js                   password-reset email via Resend
  db/auth-schema.sql         generated Better Auth tables
migrations/                  numbered, append-only D1 migrations
scripts/                     schema generation and password-hash helpers
```

## Testing

```sh
npm test        # Vitest, once
npm run build   # production build
```

The unit tests cover the pure helpers in `src/lib` and `src/data`. There is no
component-test setup — the tests run in a plain Node environment.

## Deploying

The Worker and the SPA deploy together. Create the D1 database, point the
`d1_databases` binding in `wrangler.jsonc` at it, then set the secrets:

```sh
npx wrangler secret put BETTER_AUTH_SECRET
npx wrangler secret put RESEND_API_KEY    # optional
```

Apply the migrations to the remote database and deploy:

```sh
npm run db:migrate:remote
git push origin main
```

Pushing to `main` **is** the deploy — the Cloudflare Git integration runs the
build and publishes the Worker. `npm run deploy` does the same thing from your
own machine if you prefer.

Apply migrations **before** deploying. The Worker's SQL names the columns the
migrations add, so a Worker running against an unmigrated database returns 500s
on the affected routes. The reverse order is safe, because an additive migration
is harmless to the Worker already running.

## Data and privacy

Each account's transactions, assets and settings are stored as its own rows in
D1 and are only readable with that account's session. Uploaded profile photos
are resized in the browser before being stored. Passwords are hashed by Better
Auth and are never visible to the app.

Password reset sends mail through Resend, so `MAIL_FROM` in `wrangler.jsonc`
must be an address on a domain verified with Resend. Until then only the Resend
account's own address can receive mail.

## For coding agents

See [AGENTS.md](./AGENTS.md) for the commands, architecture and constraints that
matter when working in this repository.
