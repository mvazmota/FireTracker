import { buildHolding } from './holding.js'

/**
 * Adds a coin from its symbol.
 *
 * The same deal as an ETF by ISIN: the user supplies the four things nobody
 * can look up — which coin, which broker, how much and when — and the app
 * fetches the name, the price on the day, the units that implies and the whole
 * monthly history.
 */
export function buildCryptoHolding({ lookup, prices, amount, date, platform }) {
  return buildHolding({ prefix: 'crypto', lookup, prices, amount, date, platform })
}
