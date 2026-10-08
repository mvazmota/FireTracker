/**
 * Looking up an ETF from its ISIN, and its prices, from public feeds.
 *
 * Yahoo's chart and search endpoints are undocumented and could change without
 * notice, so nothing here is allowed to be load-bearing: every caller has to
 * cope with a failure and fall back to the user typing the details by hand.
 * Results are cached in D1, so a holding is looked up once and refreshed at most
 * daily.
 */

const YAHOO = 'https://query1.finance.yahoo.com'
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'

/** A day, in milliseconds. Cached prices older than this are refreshed. */
const CACHE_MS = 24 * 60 * 60 * 1000

/**
 * Yahoo's fundamentals need a cookie and a "crumb" token before they will talk.
 * Two extra requests, once per fund, and worth it: it is where the issuer, the
 * fund size and the dividend come from.
 */
async function yahooCrumb() {
  let cookie = ''
  try {
    const first = await fetch('https://fc.yahoo.com', { headers: { 'User-Agent': USER_AGENT } })
    const setCookie = first.headers.get('set-cookie') || ''
    cookie = setCookie.split(';')[0]
  } catch {
    // The cookie is often set even when that request fails; carry on regardless.
  }
  const crumbResponse = await fetch(`${YAHOO}/v1/test/getcrumb`, { headers: { 'User-Agent': USER_AGENT, ...(cookie ? { Cookie: cookie } : {}) } })
  if (!crumbResponse.ok) throw new Error(`crumb ${crumbResponse.status}`)
  return { crumb: (await crumbResponse.text()).trim(), cookie }
}

/** A numeric field from Yahoo's `{ raw, fmt }` shape, or null. */
function numberFrom(field) {
  const value = typeof field === 'object' && field !== null ? field.raw : field
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

/**
 * Who runs the fund, how big it is, what it pays out and when it started.
 *
 * The distribution policy is not a field Yahoo exposes, so it is read from the
 * name ("... Accumulation") and cross-checked against the yield: an accumulating
 * fund reinvests and pays nothing, so a yield of zero with no name either way is
 * left unknown rather than guessed.
 */
export async function fetchFundFacts(symbol, name = '') {
  const { crumb, cookie } = await yahooCrumb()
  const url = `${YAHOO}/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=fundProfile,summaryDetail,defaultKeyStatistics&crumb=${encodeURIComponent(crumb)}`
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json', ...(cookie ? { Cookie: cookie } : {}) } })
  if (!response.ok) throw new Error(`quoteSummary ${response.status}`)

  const body = await response.json()
  const result = body?.quoteSummary?.result?.[0] || {}
  const profile = result.fundProfile || {}
  const summary = result.summaryDetail || {}
  const stats = result.defaultKeyStatistics || {}

  const yieldValue = numberFrom(summary.dividendYield)
  const lower = String(name || '').toLowerCase()
  const distribution = /accumulat|\(acc\)/.test(lower) ? 'accumulating'
    : /distribut|\(dist\)/.test(lower) ? 'distributing'
      : yieldValue != null && yieldValue > 0 ? 'distributing'
        : null

  return {
    issuer: profile.family || stats.fundFamily || null,
    fundSize: numberFrom(summary.totalAssets) ?? numberFrom(stats.totalAssets),
    dividendYield: yieldValue,
    inception: numberFrom(stats.fundInceptionDate) ? new Date(numberFrom(stats.fundInceptionDate) * 1000).toISOString().slice(0, 10) : null,
    distribution,
  }
}

async function yahooJson(url) {
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } })
  if (!response.ok) throw new Error(`yahoo responded ${response.status}`)
  return response.json()
}

/** Whether a string looks like an ISIN: two letters, nine alphanumerics, a digit. */
export function isIsin(value) {
  return /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(String(value || '').trim().toUpperCase())
}

/**
 * Whether a listing is one we can actually price: quoted in euros, with real
 * closes behind it. A symbol can report a EUR currency and still have no
 * history at all — Stuttgart answers with a currency and nothing else.
 */
async function usableListing(symbol) {
  try {
    const chart = await yahooJson(`${YAHOO}/v8/finance/chart/${encodeURIComponent(symbol)}?range=1mo&interval=1d`)
    const result = chart?.chart?.result?.[0]
    const closes = (result?.indicators?.quote?.[0]?.close || []).filter((close) => typeof close === 'number' && Number.isFinite(close))
    if (!closes.length || result?.meta?.currency !== 'EUR') return null
    return { symbol: result.meta.symbol || symbol, currency: result.meta.currency, exchange: result.meta.exchangeName || '' }
  } catch {
    return null
  }
}

/** At most this many listings are tried before giving up. */
const MAX_CANDIDATES = 10

/**
 * Resolves an ISIN to a listing we can price.
 *
 * Yahoo's ISIN search knows the fund but often not the listing worth pricing —
 * for one Vanguard fund it offers London and Stuttgart, while the Xetra listing
 * everyone actually buys is only found by searching the fund's name. So the
 * ISIN's own candidates are tried first, then the listings its name turns up.
 *
 * One ISIN maps to dozens of listings across exchanges and currencies and the
 * app only works in euros, so the first listing quoted in EUR with real history
 * wins. Anything else is reported as unsupported rather than converted at an
 * invented rate.
 */
export async function resolveIsin(isin) {
  const search = await yahooJson(`${YAHOO}/v1/finance/search?q=${encodeURIComponent(isin)}&quotesCount=10&newsCount=0`)
  const quotes = (search.quotes || []).filter((quote) => quote.symbol)
  const names = [...new Set(quotes.map((quote) => quote.longname || quote.shortname).filter(Boolean))]
  const candidates = quotes.map((quote) => quote.symbol)

  for (const name of names) {
    try {
      const wider = await yahooJson(`${YAHOO}/v1/finance/search?q=${encodeURIComponent(name)}&quotesCount=20&newsCount=0`)
      for (const quote of wider.quotes || []) {
        if (quote.symbol && quote.quoteType === 'ETF') candidates.push(quote.symbol)
      }
    } catch {
      // Carry on with the candidates we already have.
    }
  }

  const tried = new Set()
  for (const symbol of candidates.slice(0, MAX_CANDIDATES)) {
    if (tried.has(symbol)) continue
    tried.add(symbol)
    const listing = await usableListing(symbol)
    if (!listing) continue
    const named = quotes.find((quote) => quote.symbol === symbol)
    return {
      isin,
      symbol: listing.symbol,
      name: named?.longname || named?.shortname || names[0] || listing.symbol,
      currency: listing.currency,
      exchange: listing.exchange,
    }
  }
  return null
}

/**
 * Daily closes from a little before the purchase date to today.
 *
 * The window starts a week early on purpose: purchases happen at weekends and on
 * holidays, and the price that applies is the last close before them.
 */
export async function fetchPrices(symbol, from) {
  const start = Math.floor(new Date(`${from}T00:00:00Z`).getTime() / 1000) - 7 * 86400
  const url = `${YAHOO}/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${start}&period2=${Math.floor(Date.now() / 1000)}&interval=1d`
  const chart = await yahooJson(url)
  const result = chart?.chart?.result?.[0]
  const stamps = result?.timestamp || []
  const closes = result?.indicators?.quote?.[0]?.close || []

  const rows = []
  for (let index = 0; index < stamps.length; index += 1) {
    const close = closes[index]
    if (typeof close !== 'number' || !Number.isFinite(close)) continue
    rows.push({
      date: new Date(stamps[index] * 1000).toISOString().slice(0, 10),
      close: Math.round(close * 10000) / 10000,
    })
  }
  return { symbol, currency: result?.meta?.currency || '', rows }
}

/** The cached listing and fund facts for an ISIN, if we have looked it up before. */
export async function readCatalog(db, isin) {
  const row = await db.prepare('select * from "etf_catalog" where "isin" = ?').bind(isin).first()
  if (!row) return null
  return {
    isin: row.isin,
    symbol: row.symbol,
    name: row.name,
    currency: row.currency,
    exchange: row.exchange,
    issuer: row.issuer ?? null,
    fundSize: row.fundSize ?? null,
    dividendYield: row.dividendYield ?? null,
    inception: row.inception ?? null,
    ter: row.ter ?? null,
    distribution: row.distribution ?? null,
  }
}

export async function writeCatalog(db, entry) {
  await db
    .prepare('insert into "etf_catalog" ("isin", "symbol", "name", "currency", "exchange", "issuer", "fundSize", "dividendYield", "inception", "ter", "distribution", "fetchedAt") values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) on conflict("isin") do update set "symbol" = excluded."symbol", "name" = excluded."name", "currency" = excluded."currency", "exchange" = excluded."exchange", "issuer" = excluded."issuer", "fundSize" = excluded."fundSize", "dividendYield" = excluded."dividendYield", "inception" = excluded."inception", "ter" = coalesce(excluded."ter", "ter"), "distribution" = excluded."distribution", "fetchedAt" = excluded."fetchedAt"')
    .bind(
      entry.isin,
      entry.symbol,
      entry.name ?? null,
      entry.currency ?? null,
      entry.exchange ?? null,
      entry.issuer ?? null,
      entry.fundSize ?? null,
      entry.dividendYield ?? null,
      entry.inception ?? null,
      entry.ter ?? null,
      entry.distribution ?? null,
      new Date().toISOString(),
    )
    .run()
}

/**
 * The annual cost, typed by the user. No free feed publishes it, so it is the
 * one fund fact the app asks for — once per fund, then cached like the rest.
 */
export async function saveTer(db, isin, ter) {
  await db
    .prepare('insert into "etf_catalog" ("isin", "ter", "fetchedAt") values (?, ?, ?) on conflict("isin") do update set "ter" = excluded."ter"')
    .bind(isin, ter, new Date().toISOString())
    .run()
}

/**
 * The cached prices for a symbol, when they are recent enough to reuse.
 *
 * Everything cached is returned, including the few days before the date asked
 * for: a purchase can land on a weekend or a holiday, and the price that applies
 * is the last close before it.
 */
export async function readPrices(db, symbol, now = Date.now()) {
  const newest = await db.prepare('select max("fetchedAt") as "fetchedAt" from "etf_prices" where "symbol" = ?').bind(symbol).first()
  const fetchedAt = newest?.fetchedAt ? Date.parse(newest.fetchedAt) : 0
  if (!fetchedAt || now - fetchedAt > CACHE_MS) return null

  const rows = await db.prepare('select "date", "close" from "etf_prices" where "symbol" = ? order by "date"').bind(symbol).all()
  if (!rows.results?.length) return null
  return { symbol, rows: rows.results.map((row) => ({ date: row.date, close: row.close })) }
}

export async function writePrices(db, symbol, rows) {
  if (!rows.length) return
  const stamp = new Date().toISOString()
  const statements = rows.map((row) => db
    .prepare('insert into "etf_prices" ("symbol", "date", "close", "fetchedAt") values (?, ?, ?, ?) on conflict("symbol", "date") do update set "close" = excluded."close", "fetchedAt" = excluded."fetchedAt"')
    .bind(symbol, row.date, row.close, stamp))
  await db.batch(statements)
}
