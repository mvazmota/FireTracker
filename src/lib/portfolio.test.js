import { describe, expect, it } from 'vitest'
import { assetMarketValue, investmentTypeFromTransaction, isInvestmentTransaction, isSavingsTransaction, portfolioCostBasis } from './portfolio.js'

describe('portfolioCostBasis', () => {
  it('multiplies units by average cost for ETFs and crypto', () => {
    expect(portfolioCostBasis({ units: 10, averageCost: 100 }, 'etfs')).toBe(1000)
    expect(portfolioCostBasis({ units: 0.5, averageCost: 30000 }, 'crypto')).toBe(15000)
  })

  it('uses the invested amount for P2P and the invested value for bonds', () => {
    expect(portfolioCostBasis({ invested: 250 }, 'p2p')).toBe(250)
    expect(portfolioCostBasis({ investedValue: 800 }, 'bonds')).toBe(800)
  })

  it('is zero for unknown types', () => {
    expect(portfolioCostBasis({ balance: 500 }, 'savings')).toBe(0)
  })

  it('rounds the derived total to exact cents', () => {
    // 3 x 33.333333 would otherwise carry float noise into every total.
    expect(portfolioCostBasis({ units: 3, averageCost: 33.333333 }, 'etfs')).toBe(100)
    expect(assetMarketValue({ units: 7, currentPrice: 142.857142 }, 'crypto')).toBe(1000)
  })
})

describe('assetMarketValue', () => {
  it('multiplies units by the current price for ETFs and crypto', () => {
    expect(assetMarketValue({ units: 10, currentPrice: 110 }, 'etfs')).toBe(1100)
    expect(assetMarketValue({ units: 2, currentPrice: 5.5 }, 'crypto')).toBe(11)
  })

  it('uses the balance for savings and current value otherwise', () => {
    expect(assetMarketValue({ balance: 900 }, 'savings')).toBe(900)
    expect(assetMarketValue({ currentValue: 42 }, 'p2p')).toBe(42)
    expect(assetMarketValue({ currentValue: 42 }, 'bonds')).toBe(42)
  })
})

describe('investmentTypeFromTransaction', () => {
  it('prefers an explicit investmentType', () => {
    expect(investmentTypeFromTransaction({ investmentType: 'crypto', title: 'ETF purchase' })).toBe('crypto')
  })

  it('falls back to the title when investmentType is missing', () => {
    expect(investmentTypeFromTransaction({ title: 'ETF purchase · VWCE' })).toBe('etfs')
    expect(investmentTypeFromTransaction({ title: 'Crypto purchase · BTC' })).toBe('crypto')
    expect(investmentTypeFromTransaction({ title: 'P2P investment · Mintos' })).toBe('p2p')
    expect(investmentTypeFromTransaction({ title: 'Bond purchase · Portugal Treasury' })).toBe('bonds')
  })

  it('returns null when nothing matches', () => {
    expect(investmentTypeFromTransaction({ title: 'Weekly groceries' })).toBeNull()
  })
})

describe('category guards', () => {
  it('recognises investment transactions', () => {
    expect(isInvestmentTransaction({ category: 'Investment' })).toBe(true)
    expect(isInvestmentTransaction({ category: 'Investments' })).toBe(true)
    expect(isInvestmentTransaction({ category: 'Savings' })).toBe(false)
  })

  it('recognises savings transactions', () => {
    expect(isSavingsTransaction({ category: 'Savings' })).toBe(true)
    expect(isSavingsTransaction({ category: 'Housing' })).toBe(false)
  })
})
