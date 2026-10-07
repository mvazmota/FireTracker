import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { btcPriceAt, demoTransactionsForEmptyMonths, threeYearSimulation } from './simulation.js'

const NOW = new Date(2026, 5, 15, 12, 0, 0)
let simulation

beforeAll(() => {
  // The simulation is memoised and reads the clock, so it must not be built
  // until the clock is fixed — otherwise it runs against the real date.
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  simulation = threeYearSimulation()
})

afterAll(() => {
  vi.useRealTimers()
})

describe('btcPriceAt', () => {
  it('is deterministic', () => {
    expect(btcPriceAt(0)).toBe(btcPriceAt(0))
    expect(btcPriceAt(12)).toBe(btcPriceAt(12))
  })

  it('never drops below the floor price', () => {
    for (let index = 0; index < 36; index += 1) {
      expect(btcPriceAt(index)).toBeGreaterThanOrEqual(12000)
    }
  })
})

describe('threeYearSimulation', () => {
  it('is memoised, so repeated calls return the same object', () => {
    expect(threeYearSimulation()).toBe(simulation)
  })

  it('covers 36 consecutive months ending in the current one', () => {
    const months = [...new Set(simulation.transactions.map((item) => item.date.slice(0, 7)))].sort()
    expect(months).toHaveLength(36)
    expect(months[0]).toBe('2023-07')
    expect(months.at(-1)).toBe('2026-06')
  })

  it('produces well-formed, uniquely identified transactions', () => {
    const ids = new Set()
    for (const item of simulation.transactions) {
      expect(item.title).toBeTruthy()
      expect(item.category).toBeTruthy()
      expect(['income', 'expense']).toContain(item.type)
      expect(item.amount).toBeGreaterThan(0)
      expect(item.date).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/)
      expect(ids.has(item.id)).toBe(false)
      ids.add(item.id)
    }
    expect(simulation.transactions.length).toBeGreaterThan(400)
  })

  it('sorts transactions chronologically', () => {
    const dates = simulation.transactions.map((item) => item.date)
    expect([...dates].sort()).toEqual(dates)
  })

  it('never dates a transaction beyond today', () => {
    const today = '2026-06-15'
    for (const item of simulation.transactions) {
      expect(item.date.slice(0, 10) <= today).toBe(true)
    }
  })

  it('seeds one holding per asset type with a monthly history', () => {
    expect(simulation.etfs).toHaveLength(1)
    expect(simulation.crypto).toHaveLength(1)
    expect(simulation.p2p).toHaveLength(1)
    expect(simulation.bonds).toHaveLength(1)
    expect(simulation.savings).toHaveLength(1)
    expect(simulation.etfs[0].units).toBeGreaterThan(0)
    expect(simulation.etfs[0].history).toHaveLength(36)
    expect(simulation.savings[0].balance).toBeGreaterThan(0)
  })
})

describe('demoTransactionsForEmptyMonths', () => {
  it('only returns months that have no activity yet', () => {
    const missing = demoTransactionsForEmptyMonths([{ date: '2026-06-01T12:00:00' }])
    expect(missing.length).toBeGreaterThan(0)
    expect(missing.every((item) => item.date.slice(0, 7) !== '2026-06')).toBe(true)
  })

  it('returns nothing once every month already has activity', () => {
    expect(demoTransactionsForEmptyMonths(simulation.transactions)).toEqual([])
  })
})
