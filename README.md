# Firepath

A React app for tracking monthly finances and investments while working towards a personal FIRE goal.

## Run locally

```sh
npm install
npm run dev
```

## Deploy to Cloudflare Pages

The app is a static single-page build, so Cloudflare Pages can host it directly.

Direct upload with Wrangler:

```sh
npx wrangler login          # sign in to (or create) your Cloudflare account
npm run deploy              # builds dist/ and uploads it to the "firepath" project
```

The first deploy creates the Pages project if it does not exist. Afterwards the site is available at `https://firepath.pages.dev` (or the project name you chose).

Git integration alternative: push this repository to GitHub or GitLab, then in the Cloudflare dashboard choose **Workers & Pages → Create → Pages → Connect to Git**. Set the build command to `npm run build` and the output directory to `dist`.

`public/_redirects` provides an SPA fallback and `public/_headers` sets asset caching and basic security headers. All data is stored in the visitor's browser, so no backend or database is required.

Transactions and each account/investment type are stored separately in this browser's local storage and displayed in euros. Transactions include an optional platform field and can use custom platforms and categories. The starter scenario simulates 36 months: €2,000 monthly salary, €1,500 August/December bonuses, seasonal utility bills, everyday purchases, monthly ETF contributions, quarterly bond purchases, and an emergency fund built towards six months of regular expenses. A one-time data version replaces earlier demo records with this scenario; later edits persist normally. New portfolio purchases create monthly expenses in the Investment category, and savings contributions are tracked as Savings transfers. The saving rate counts cash saved plus invested capital. The FIRE meter starts with an editable €300,000 goal. The Global Position section charts cash and each asset over 3, 6, 12, 24, or all recorded months. Record monthly investment values to follow their evolution; editing a holding also updates the current month's snapshot. Investment prices are illustrative, manually entered values—not live market quotes.

The Profile & settings page stores a display name, account creation date, an optional profile photo, and per-type investment visibility. Uploaded photos are resized in the browser and kept in local storage; they are never sent to a server. Hiding an investment type removes it from navigation, the overview and the global position while keeping its data.

The overview summarizes all investment types and estimates tracked cash plus portfolio value from recorded income, non-investment expenses, and investment cost basis. It excludes opening balances and debts, so it is not a complete net-worth figure unless you have logged your full history.
