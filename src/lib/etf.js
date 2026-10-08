import { buildHolding, monthlyHistory } from './holding.js'

export { monthlyHistory }

/**
 * Adds an ETF from its ISIN.
 *
 * The user supplies the four things nobody can look up — which fund, which
 * broker, how much and when — and the app fetches the name, the price on the
 * day, the units that implies and the whole monthly history.
 */
export function buildEtfHolding({ lookup, prices, amount, date, platform }) {
  return buildHolding({ prefix: 'etf', lookup, prices, amount, date, platform, isin: lookup?.isin })
}
