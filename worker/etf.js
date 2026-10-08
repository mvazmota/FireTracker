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

/** The cached listing for an ISIN, if we have looked it up before. */
export async function readCatalog(db, isin) {
  const row = await db.prepare('select * from "etf_catalog" where "isin" = ?').bind(isin).first()
  return row ? { isin: row.isin, symbol: row.symbol, name: row.name, currency: row.currency, exchange: row.exchange } : null
}

export async function writeCatalog(db, entry) {
  await db
    .prepare('insert into "etf_catalog" ("isin", "symbol", "name", "currency", "exchange", "fetchedAt") values (?, ?, ?, ?, ?, ?) on conflict("isin") do update set "symbol" = excluded."symbol", "name" = excluded."name", "currency" = excluded."currency", "exchange" = excluded."exchange", "fetchedAt" = excluded."fetchedAt"')
    .bind(entry.isin, entry.symbol, entry.name ?? null, entry.currency ?? null, entry.exchange ?? null, new Date().toISOString())
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
