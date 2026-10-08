import { describe, expect, it } from 'vitest'
import { buildCryptoHolding } from './crypto.js'

const LOOKUP = { symbol: 'BTC-EUR', name: 'Bitcoin EUR', currency: 'EUR', exchange: 'CCC' }

/** A short series around a purchase on 2026-03-14, which was a Saturday. */
const PRICES = [
  { date: '2026-03-11', close: 60000 },
  { date: '2026-03-12', close: 61000 },
  { date: '2026-03-13', close: 61500 },
  { date: '2026-03-16', close: 62000 },
  { date: '2026-04-30', close: 65000 },
]

describe('buildCryptoHolding', () => {
  it('derives units from the price on the day', () => {
    const holding = buildCryptoHolding({ lookup: LOOKUP, prices: PRICES, amount: 500, date: '2026-03-12', platform: 'Coinbase' })
    expect(holding.units).toBeCloseTo(500 / 61000, 8)
    expect(holding.averageCost).toBe(61000)
    expect(holding.symbol).toBe('BTC-EUR')
    expect(holding.name).toBe('Bitcoin EUR')
    expect(holding.platform).toBe('Coinbase')
  })

  it('uses the last close before a weekend or holiday', () => {
    // The 14th was a Saturday, so the Friday close applies.
    const holding = buildCryptoHolding({ lookup: LOOKUP, prices: PRICES, amount: 500, date: '2026-03-14' })
    expect(holding.averageCost).toBe(61500)
  })

  it('takes the current price from the end of the series', () => {
    const holding = buildCryptoHolding({ lookup: LOOKUP, prices: PRICES, amount: 500, date: '2026-03-12' })
    expect(holding.currentPrice).toBe(65000)
  })

  it('values each month at its own last close', () => {
    const holding = buildCryptoHolding({ lookup: LOOKUP, prices: PRICES, amount: 500, date: '2026-03-12' })
    const [march] = holding.history
    expect(march.value).toBeCloseTo((500 / 61000) * 62000, 2)
    expect(march.invested).toBe(500)
  })

  it('makes an id that is stable for the same coin and date', () => {
    const first = buildCryptoHolding({ lookup: LOOKUP, prices: PRICES, amount: 500, date: '2026-03-12' })
    const second = buildCryptoHolding({ lookup: LOOKUP, prices: PRICES, amount: 900, date: '2026-03-12' })
    expect(first.id).toBe(second.id)
  })

  it('has nothing to build without a coin, an amount or prices', () => {
    expect(buildCryptoHolding({ lookup: null, prices: PRICES, amount: 500, date: '2026-03-12' })).toBeNull()
    expect(buildCryptoHolding({ lookup: LOOKUP, prices: PRICES, amount: 0, date: '2026-03-12' })).toBeNull()
    expect(buildCryptoHolding({ lookup: LOOKUP, prices: [], amount: 500, date: '2026-03-12' })).toBeNull()
  })
})
