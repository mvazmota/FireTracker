import { describe, expect, it } from 'vitest'
import { buildEtfHolding, monthlyHistory } from './etf.js'

const LOOKUP = { isin: 'IE00BFMXXD54', symbol: 'VUAA.DE', name: 'Vanguard S&P 500 UCITS ETF', currency: 'EUR', exchange: 'GER' }

/** A short series around a purchase on 2026-03-14, which was a Saturday. */
const PRICES = [
  { date: '2026-03-11', close: 100 },
  { date: '2026-03-12', close: 101 },
  { date: '2026-03-13', close: 102 },
  { date: '2026-03-16', close: 104 },
  { date: '2026-04-30', close: 110 },
]

describe('buildEtfHolding', () => {
  it('derives units from the price on the day', () => {
    const holding = buildEtfHolding({ lookup: LOOKUP, prices: PRICES, amount: 500, date: '2026-03-12', platform: 'Trade Republic' })
    expect(holding.units).toBeCloseTo(500 / 101, 8)
    expect(holding.averageCost).toBe(101)
    expect(holding.symbol).toBe('VUAA.DE')
    expect(holding.isin).toBe('IE00BFMXXD54')
    expect(holding.platform).toBe('Trade Republic')
  })

  it('uses the last close before a weekend or holiday', () => {
    // The 14th was a Saturday, so the Friday close applies.
    const holding = buildEtfHolding({ lookup: LOOKUP, prices: PRICES, amount: 500, date: '2026-03-14' })
    expect(holding.averageCost).toBe(102)
  })

  it('takes the current price from the end of the series', () => {
    const holding = buildEtfHolding({ lookup: LOOKUP, prices: PRICES, amount: 500, date: '2026-03-12' })
    expect(holding.currentPrice).toBe(110)
  })

  it('values each month at its own last close', () => {
    const holding = buildEtfHolding({ lookup: LOOKUP, prices: PRICES, amount: 500, date: '2026-03-12' })
    const [march] = holding.history
    // Bought at 101, and March ended at 104.
    expect(march.value).toBeCloseTo((500 / 101) * 104, 2)
    expect(march.invested).toBe(500)
  })

  it('makes an id that is stable for the same fund and date', () => {
    const first = buildEtfHolding({ lookup: LOOKUP, prices: PRICES, amount: 500, date: '2026-03-12' })
    const second = buildEtfHolding({ lookup: LOOKUP, prices: PRICES, amount: 900, date: '2026-03-12' })
    expect(first.id).toBe(second.id)
  })

  it('has nothing to build without a fund, an amount or prices', () => {
    expect(buildEtfHolding({ lookup: null, prices: PRICES, amount: 500, date: '2026-03-12' })).toBeNull()
    expect(buildEtfHolding({ lookup: LOOKUP, prices: PRICES, amount: 0, date: '2026-03-12' })).toBeNull()
    expect(buildEtfHolding({ lookup: LOOKUP, prices: [], amount: 500, date: '2026-03-12' })).toBeNull()
  })
})

describe('monthlyHistory', () => {
  it('keeps one point per month, the last one', () => {
    const history = monthlyHistory(PRICES, 500, 5)
    expect(history.map((point) => point.month)).toEqual(['2026-03', '2026-04'])
    expect(history[0].value).toBe(520)
    expect(history[1].value).toBe(550)
    expect(history.every((point) => point.invested === 500)).toBe(true)
  })
})
