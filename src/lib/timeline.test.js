import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { buildPositionTimeline } from './timeline.js'

const FULL_VISIBILITY = { etfs: true, crypto: true, p2p: true, bonds: true, savings: true }
const NO_ASSETS = { etfs: [], crypto: [], p2p: [], bonds: [], savings: [] }

beforeAll(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 2, 15, 12, 0, 0))
})
afterAll(() => {
  vi.useRealTimers()
})

describe('buildPositionTimeline', () => {
  it('accumulates cash month by month up to the current month', () => {
    const timeline = buildPositionTimeline({
      transactions: [
        { date: '2026-01-10T12:00:00', type: 'income', amount: 1000, category: 'Salary' },
        { date: '2026-02-10T12:00:00', type: 'expense', amount: 400, category: 'Housing' },
      ],
      ...NO_ASSETS,
      visibility: FULL_VISIBILITY,
    })

    expect(timeline.map((point) => point.month)).toEqual(['2026-01', '2026-02', '2026-03'])
    expect(timeline.map((point) => point.cash)).toEqual([1000, 600, 600])
    expect(timeline.at(-1).position).toBe(600)
  })

  it('counts an investment expense as spending only when its asset type is hidden', () => {
    const transactions = [
      { date: '2026-01-10T12:00:00', type: 'expense', amount: 300, category: 'Investment', investmentType: 'crypto' },
    ]

    const shown = buildPositionTimeline({ transactions, ...NO_ASSETS, visibility: FULL_VISIBILITY })
    const hidden = buildPositionTimeline({ transactions, ...NO_ASSETS, visibility: { ...FULL_VISIBILITY, crypto: false } })

    // Visible: the money moved into an asset, so it is not an expense.
    expect(shown.at(-1).cash).toBe(0)
    // Hidden: the asset is invisible, so the outflow is treated as spending.
    expect(hidden.at(-1).cash).toBe(-300)
  })

  it('carries each asset forward from its stored history and uses the live value this month', () => {
    const timeline = buildPositionTimeline({
      transactions: [],
      ...NO_ASSETS,
      etfs: [{ units: 10, averageCost: 100, currentPrice: 110, history: [{ month: '2026-02', value: 1050, invested: 1000 }] }],
      visibility: FULL_VISIBILITY,
    })

    const february = timeline.find((point) => point.month === '2026-02')
    const march = timeline.find((point) => point.month === '2026-03')

    expect(february.etfs).toBe(1050)
    expect(february.invested).toBe(1000)
    expect(march.etfs).toBe(1100)
    expect(march.assets).toBe(1100)
    expect(march.position).toBe(march.cash + 1100)
  })

  it('never counts savings balances towards invested capital', () => {
    const timeline = buildPositionTimeline({
      transactions: [],
      ...NO_ASSETS,
      savings: [{ balance: 5000, history: [{ month: '2026-01', value: 5000 }] }],
      visibility: FULL_VISIBILITY,
    })

    const last = timeline.at(-1)
    expect(last.savings).toBe(5000)
    expect(last.invested).toBe(0)
    expect(last.position).toBe(5000)
  })
})
