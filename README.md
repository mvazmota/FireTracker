# Firepath

A React app for tracking monthly finances and investments while working towards a personal FIRE goal.

## Run locally

```sh
npm install
npm run dev
```

## Project structure

```
src/
  main.jsx                 app entry — mounts <App/> inside an error boundary
  App.jsx                  <App/> wraps <AppShell/> in the providers
  app/AppProviders.jsx     composes the language, settings and finance providers
  components/
    ErrorBoundary.jsx      keeps a crash from blanking the page
    ui/                    Avatar, IconBadge, PlatformSelector
    layout-facing pages/   overview, position, transactions, statistics, profile
    transactions/          TransactionModal, AllTransactionsPage
    investments/           ETF, crypto, P2P, bond and savings screens + modals
    charts/                cash-flow, spending and evolution charts
    fire/                  FireMeterCompact, FireGoalModal
  context/
    SettingsProvider.jsx   profile, FIRE goal, visibility, platforms, categories
    FinanceProvider.jsx    transactions + assets, and every mutation
  hooks/usePortfolioSummary.js  derived dashboard totals
  i18n/
    messages.jsx           EN / PT-PT copy
    LanguageProvider.jsx   active language + useI18n()
  data/categories.js       built-in categories with icons and colours
  lib/
    constants.js           storage keys, defaults, asset types
    dates.js               month keys, timestamps, date formatting
    format.js              currency, percent and number formatting
    image.js               avatar initials and image downscaling
    portfolio.js           cost basis, market value, asset classification
    simulation.js          the 36-month starter scenario
    storage.js             localStorage load/save and first-run seeding
    timeline.js            cash + per-asset history reconstruction
  styles/
    index.css              imports the others, in cascade order
    base.css               design tokens, reset, error boundary
    layout.css             app shell, sidebar, top bar, page frame
    components.css         cards, panels, tables, modals, forms
    features.css           overview, position, investments, profile
    responsive.css         every media query, loaded last
```

Built on React 19 with `@vitejs/plugin-react` and the **React Compiler** enabled (see `vite.config.js`) for automatic memoization. Imports use explicit file extensions.

## Deploy to Cloudflare Pages

The app is a static single-page build, so Cloudflare can host it directly. Navigation is handled in-app rather than by URL routes, so no SPA fallback redirect is needed. `public/_headers` sets asset caching and basic security headers. All data is stored in the visitor's browser, so no backend or database is required.

### Option A — Git integration (continuous deployment)

1. Push this repository to GitHub.
2. In the Cloudflare dashboard open **Workers & Pages → Create → Pages → Connect to Git**.
3. Authorize GitHub and select the repository.
4. Use these build settings:
   - **Production branch:** `main`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
5. Save and deploy. Every push to `main` redeploys automatically.

### Option B — Direct upload with Wrangler

```sh
npx wrangler login          # sign in to (or create) your Cloudflare account
npm run deploy              # builds dist/ and uploads it to the "firepath" project
```

The first deploy creates the Pages project if it does not exist. Afterwards the site is available at `https://<project-name>.pages.dev`.

Transactions and each account/investment type are stored separately in this browser's local storage and displayed in euros. Each transaction stores a full date and time (shown as date plus hours and minutes in tables), includes an optional platform field, and can use custom platforms and categories. The starter scenario simulates 36 months for someone earning €2,000 a month: a €750 quarterly bonus (March, June, September, December), seasonal utility bills, everyday spending and a summer holiday, monthly ETF (€150) and P2P (€50) contributions, quarterly bond (€200) and crypto (€150 BTC, bought when the bonus lands) purchases, and an emergency fund built towards six months of regular expenses. A one-time data version replaces earlier demo records with this scenario; later edits persist normally. New portfolio purchases create monthly expenses in the Investment category, and savings contributions are tracked as Savings transfers. The saving rate counts cash saved plus invested capital. The FIRE meter starts with an editable €300,000 goal. The Global Position section charts cash and each asset over 3, 6, 12, 24, or all recorded months. Record monthly investment values to follow their evolution; editing a holding also updates the current month's snapshot. Investment prices are illustrative, manually entered values—not live market quotes.

The Profile & settings page stores a display name, account creation date, an optional profile photo, per-type investment visibility, and the FIRE meter settings (goal amount and whether the meter appears in the sidebar). Clicking the sidebar FIRE meter plays a short fire animation rather than opening an editor. Uploaded photos are resized in the browser and kept in local storage; they are never sent to a server. Hiding an investment type removes it from navigation, the overview and the global position while keeping its data.

The overview summarizes all investment types and estimates tracked cash plus portfolio value from recorded income, non-investment expenses, and investment cost basis. It excludes opening balances and debts, so it is not a complete net-worth figure unless you have logged your full history.
