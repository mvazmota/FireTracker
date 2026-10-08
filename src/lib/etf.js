import { roundMoney } from './money.js'

/**
 * Turns a looked-up fund, its prices and what the user paid into a holding.
 *
 * The user gives an ISIN, a platform, an amount and a date; everything else is
 * derived. Units come from the closing price on the day, so nobody has to know
 * them — and the monthly history comes from the same series, which is why an
 * ETF added this way never needs a monthly value typed in by hand.
 */
export function buildEtfHolding({ lookup, prices, amount, date, platform }) {
  const paid = Number(amount)
  if (!lookup?.symbol || !(paid > 0) || !Array.isArray(prices) || !prices.length) return null

  // The price that applies is the last close on or before the purchase date:
  // purchases land on weekends and holidays too.
  const before = prices.filter((point) => point.date <= date)
  const entry = before.length ? before[before.length - 1] : prices[0]
  if (!(entry?.close > 0)) return null

  const units = paid / entry.close
  const latest = prices[prices.length - 1]

  return {
    id: `etf-${lookup.symbol.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${date}`,
    isin: lookup.isin,
    symbol: lookup.symbol,
    name: lookup.name || lookup.symbol,
    platform: platform || '',
    units: Math.round(units * 1e8) / 1e8,
    averageCost: roundMoney(paid / units),
    currentPrice: roundMoney(latest.close),
    history: monthlyHistory(prices, paid, units),
  }
}

/**
 * Month-end value and cost basis, which is the shape the chart and the tables
 * already read. One purchase means the cost basis is the same every month.
 */
export function monthlyHistory(prices, invested, units) {
  const byMonth = new Map()
  for (const point of prices) byMonth.set(point.date.slice(0, 7), point)
  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, point]) => ({ month, value: roundMoney(units * point.close), invested: roundMoney(invested) }))
}
