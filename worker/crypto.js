/**
 * Looking up a coin from its symbol, and its prices, from the same public feed
 * the ETFs use.
 *
 * The app only works in euros, so a symbol is resolved to its euro listing
 * (BTC -> BTC-EUR) rather than converted at an invented rate. The feed is
 * undocumented and could change without notice, so nothing here is allowed to
 * be load-bearing: every caller has to cope with a failure and fall back to the
 * user typing the details by hand. Results are cached in D1, so a holding is
 * looked up once and refreshed at most daily.
 */

const YAHOO = 'https://query1.finance.yahoo.com'
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'

/** A day, in milliseconds. Cached prices older than this are refreshed. */
const CACHE_MS = 24 * 60 * 60 * 1000

/** An hour. The current quote moves, so it is refreshed far more often. */
const MARKET_CACHE_MS = 60 * 60 * 1000

async function yahooJson(url) {
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } })
  if (!response.ok) throw new Error(`yahoo responded ${response.status}`)
  return response.json()
}

/** Whether a symbol is a coin ticker, with or without its market suffix. */
export function isCoinSymbol(value) {
  return /^[A-Z0-9]{1,10}(-[A-Z0-9]{2,5})?$/.test(String(value || '').trim().toUpperCase())
}

/**
 * Whether a listing is one we can actually price: quoted in euros, with real
 * closes behind it. The search does not always turn up the euro listing — for
 * some coins it offers the dollar one and nothing else — so the euro pair is
 * tried directly before giving up.
 */
async function usableListing(symbol) {
  try {
    const chart = await yahooJson(`${YAHOO}/v8/finance/chart/${encodeURIComponent(symbol)}?range=1mo&interval=1d`)
    const result = chart?.chart?.result?.[0]
    const closes = (result?.indicators?.quote?.[0]?.close || []).filter((close) => typeof close === 'number' && Number.isFinite(close))
    if (!closes.length || result?.meta?.currency !== 'EUR') return null
    return {
      symbol: result.meta.symbol || symbol,
      name: result.meta.longName || result.meta.shortName || result.meta.symbol || symbol,
      currency: result.meta.currency,
      exchange: result.meta.exchangeName || '',
    }
  } catch {
    return null
  }
}

/**
 * Resolves a coin symbol to the euro listing we price it from.
 *
 * The search turns up every currency the coin trades in; the euro one is the
 * only usable answer, for the same reason the ETF lookup picks the euro
 * listing. A symbol that already names its market is taken as it stands.
 */
export async function resolveSymbol(symbol) {
  const upper = String(symbol || '').trim().toUpperCase()
  if (!upper) return null

  const search = await yahooJson(`${YAHOO}/v1/finance/search?q=${encodeURIComponent(upper)}&quotesCount=20&newsCount=0`)
  const quotes = (search.quotes || []).filter((quote) => quote.symbol && quote.quoteType === 'CRYPTOCURRENCY')

  const euro = quotes.find((quote) => quote.symbol === `${upper}-EUR`)
    || quotes.find((quote) => (quote.currency || '').toUpperCase() === 'EUR')
  if (euro) {
    return {
      symbol: euro.symbol,
      name: euro.longname || euro.shortname || euro.symbol,
      currency: 'EUR',
      exchange: euro.exchange || '',
    }
  }

  return usableListing(`${upper}-EUR`)
}

/**
 * Daily closes from a little before the purchase date to today, plus the
 * market facts the details row shows.
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

  const meta = result?.meta || {}
  return {
    symbol,
    currency: meta.currency || '',
    rows,
    market: {
      price: typeof meta.regularMarketPrice === 'number' ? meta.regularMarketPrice : null,
      changePercent: typeof meta.regularMarketChangePercent === 'number' ? meta.regularMarketChangePercent : null,
      high52: typeof meta.fiftyTwoWeekHigh === 'number' ? meta.fiftyTwoWeekHigh : null,
      low52: typeof meta.fiftyTwoWeekLow === 'number' ? meta.fiftyTwoWeekLow : null,
    },
  }
}

/** The cached prices for a symbol, when they are recent enough to reuse. */
export async function readPrices(db, symbol, now = Date.now()) {
  const newest = await db.prepare('select max("fetchedAt") as "fetchedAt" from "crypto_prices" where "symbol" = ?').bind(symbol).first()
  const fetchedAt = newest?.fetchedAt ? Date.parse(newest.fetchedAt) : 0
  if (!fetchedAt || now - fetchedAt > CACHE_MS) return null

  const rows = await db.prepare('select "date", "close" from "crypto_prices" where "symbol" = ? order by "date"').bind(symbol).all()
  if (!rows.results?.length) return null
  return { symbol, rows: rows.results.map((row) => ({ date: row.date, close: row.close })) }
}

export async function writePrices(db, symbol, rows) {
  if (!rows.length) return
  const stamp = new Date().toISOString()
  const statements = rows.map((row) => db
    .prepare('insert into "crypto_prices" ("symbol", "date", "close", "fetchedAt") values (?, ?, ?, ?) on conflict("symbol", "date") do update set "close" = excluded."close", "fetchedAt" = excluded."fetchedAt"')
    .bind(symbol, row.date, row.close, stamp))
  await db.batch(statements)
}

/** The cached current quote for a symbol, when it is recent enough to reuse. */
export async function readCryptoMarket(db, symbol, now = Date.now()) {
  const row = await db.prepare('select * from "crypto_market" where "symbol" = ?').bind(symbol).first()
  if (!row?.fetchedAt || now - Date.parse(row.fetchedAt) > MARKET_CACHE_MS) return null
  return {
    price: row.price ?? null,
    changePercent: row.changePercent ?? null,
    high52: row.high52 ?? null,
    low52: row.low52 ?? null,
  }
}

export async function writeCryptoMarket(db, symbol, market) {
  await db
    .prepare('insert into "crypto_market" ("symbol", "price", "changePercent", "high52", "low52", "fetchedAt") values (?, ?, ?, ?, ?, ?) on conflict("symbol") do update set "price" = excluded."price", "changePercent" = excluded."changePercent", "high52" = excluded."high52", "low52" = excluded."low52", "fetchedAt" = excluded."fetchedAt"')
    .bind(symbol, market.price ?? null, market.changePercent ?? null, market.high52 ?? null, market.low52 ?? null, new Date().toISOString())
    .run()
}
