import { describe, expect, it } from 'vitest'
import { monthKey } from './dates.js'
import { WITHDRAWAL_RATE, annualAverages, compareGoal, estimateProjection, fireProjection, fireTarget, projectSeries, yearsToTarget } from './fire.js'

const TODAY = new Date(2026, 5, 15)

/** The last `count` month keys, oldest first, ending with the current month. */
function monthsBack(today, count) {
  return Array.from({ length: count }, (_, index) => monthKey(new Date(today.getFullYear(), today.getMonth() - (count - 1 - index), 1)))
}

/** Twelve months of: 1000 income, 400 living costs, 100 into investments. */
function fullYear() {
  const rows = []
  for (const month of monthsBack(TODAY, 12)) {
    rows.push({ date: `${month}-01T09:00:00`, type: 'income', amount: 1000, category: 'Salary' })
    rows.push({ date: `${month}-05T09:00:00`, type: 'expense', amount: 400, category: 'Housing' })
    rows.push({ date: `${month}-07T09:00:00`, type: 'expense', amount: 100, category: 'Investment' })
  }
  return rows
}

describe('annualAverages', () => {
  it('annualises a full year of activity', () => {
    expect(annualAverages(fullYear(), TODAY)).toEqual({ months: 12, income: 12000, expenses: 4800, saved: 1200, savings: 7200 })
  })

  it('treats investment and savings transfers as saving, not spending', () => {
    const rows = [
      { date: '2026-05-01T09:00:00', type: 'income', amount: 3000, category: 'Salary' },
      { date: '2026-05-02T09:00:00', type: 'expense', amount: 500, category: 'Housing' },
      { date: '2026-05-03T09:00:00', type: 'expense', amount: 800, category: 'Investment' },
      { date: '2026-05-04T09:00:00', type: 'expense', amount: 200, category: 'Savings' },
    ]
    const result = annualAverages(rows, new Date(2026, 5, 15))
    // One month of history, so everything is scaled by twelve.
    expect(result.months).toBe(1)
    expect(result.expenses).toBe(6000)
    expect(result.saved).toBe(12000)
    expect(result.savings).toBe(30000)
  })

  it('does not divide by twelve when there is less history', () => {
    const rows = [
      { date: '2026-04-01T09:00:00', type: 'income', amount: 500, category: 'Salary' },
      { date: '2026-05-01T09:00:00', type: 'income', amount: 500, category: 'Salary' },
      { date: '2026-06-01T09:00:00', type: 'income', amount: 500, category: 'Salary' },
    ]
    const result = annualAverages(rows, TODAY)
    expect(result.months).toBe(3)
    expect(result.income).toBe(6000)
  })

  it('ignores anything older than the window', () => {
    const rows = [
      ...fullYear(),
      { date: '2024-01-01T09:00:00', type: 'expense', amount: 99999, category: 'Housing' },
    ]
    expect(annualAverages(rows, TODAY).expenses).toBe(4800)
  })

  it('copes with no transactions at all', () => {
    expect(annualAverages([], TODAY)).toEqual({ months: 1, income: 0, expenses: 0, saved: 0, savings: 0 })
  })
})

describe('fireTarget', () => {
  it('is twenty-five times annual spending at a 4% withdrawal rate', () => {
    expect(WITHDRAWAL_RATE).toBe(0.04)
    expect(fireTarget(4800)).toBe(120000)
    expect(fireTarget(30000)).toBe(750000)
  })

  it('is zero when there is nothing to cover', () => {
    expect(fireTarget(0)).toBe(0)
    expect(fireTarget(-100)).toBe(0)
  })

  it('honours a different withdrawal rate', () => {
    expect(fireTarget(10000, 0.05)).toBe(200000)
  })
})

describe('yearsToTarget', () => {
  it('solves the compound formula', () => {
    // 0 growing at 5% with 12k a year reaches 120k in a little over 8 years.
    const years = yearsToTarget({ current: 0, annualSavings: 12000, target: 120000 })
    expect(years).toBeCloseTo(8.31, 1)
  })

  it('needs no time once the target is met', () => {
    expect(yearsToTarget({ current: 200000, annualSavings: 0, target: 120000 })).toBe(0)
  })

  it('relies on growth alone when nothing is being saved', () => {
    expect(yearsToTarget({ current: 60000, annualSavings: 0, target: 120000 })).toBeCloseTo(14.2, 1)
  })

  it('takes longer with no growth at all', () => {
    expect(yearsToTarget({ current: 0, annualSavings: 12000, target: 120000, realReturn: 0 })).toBe(10)
  })

  it('is never reached when money goes out faster than it comes in', () => {
    expect(yearsToTarget({ current: 0, annualSavings: -1000, target: 120000 })).toBeNull()
  })

  it('is never reached with no growth and no saving', () => {
    expect(yearsToTarget({ current: 5000, annualSavings: 0, target: 120000, realReturn: 0 })).toBeNull()
  })

  it('is null when there is no target', () => {
    expect(yearsToTarget({ current: 0, annualSavings: 12000, target: 0 })).toBeNull()
  })
})

describe('projectSeries', () => {
  it('compounds and adds the annual contribution', () => {
    expect(projectSeries({ current: 0, annualSavings: 12000, realReturn: 0.05, years: 3 })).toEqual([
      { year: 0, value: 0 },
      { year: 1, value: 12000 },
      { year: 2, value: 24600 },
      { year: 3, value: 37830 },
    ])
  })

  it('passes through the starting value in year zero', () => {
    expect(projectSeries({ current: 1234.56, annualSavings: 0, realReturn: 0.05, years: 0 })).toEqual([{ year: 0, value: 1234.56 }])
  })
})

describe('fireProjection', () => {
  it('ties the pieces together', () => {
    const projection = fireProjection({ transactions: fullYear(), currentPosition: 60000, today: TODAY })

    expect(projection.target).toBe(120000)
    expect(projection.months).toBe(12)
    expect(projection.savings).toBe(7200)
    expect(projection.reached).toBe(false)
    expect(projection.years).toBeGreaterThan(0)
    expect(projection.targetDate.getFullYear()).toBeGreaterThanOrEqual(2026)
  })

  it('reports the goal as reached once the position passes it', () => {
    const projection = fireProjection({ transactions: fullYear(), currentPosition: 150000, today: TODAY })
    expect(projection.reached).toBe(true)
    expect(projection.years).toBe(0)
  })

  it('reports no date when there is nothing to cover', () => {
    const projection = fireProjection({ transactions: [], currentPosition: 0, today: TODAY })
    expect(projection.target).toBe(0)
    expect(projection.reached).toBe(false)
    expect(projection.years).toBeNull()
    expect(projection.targetDate).toBeNull()
    expect(projection.estimated).toBe(false)
  })

  it('starts from the tracked position', () => {
    expect(fireProjection({ transactions: [], currentPosition: 42000, today: TODAY }).current).toBe(42000)
  })
})

describe('estimateProjection', () => {
  const estimate = { income: 30000, spending: 20000, savingsRate: 40 }

  it('builds a projection from the onboarding answers', () => {
    const projection = estimateProjection({ estimate, currentPosition: 0, today: TODAY })
    expect(projection.estimated).toBe(true)
    expect(projection.target).toBe(500000)
    expect(projection.savings).toBe(12000)
    expect(projection.years).toBeGreaterThan(0)
  })

  it('prefers a stated savings rate over income minus spending', () => {
    // 40% of 30000 is 12000, whereas income minus spending would be 10000.
    expect(estimateProjection({ estimate, currentPosition: 0, today: TODAY }).savings).toBe(12000)
  })

  it('falls back to income minus spending when no rate was given', () => {
    const projection = estimateProjection({ estimate: { income: 30000, spending: 20000 }, currentPosition: 0, today: TODAY })
    expect(projection.savings).toBe(10000)
  })

  it('handles a missing estimate', () => {
    const projection = estimateProjection({ estimate: null, currentPosition: 0, today: TODAY })
    expect(projection.target).toBe(0)
    expect(projection.years).toBeNull()
  })

  it('starts from the capital the user says they already have', () => {
    const without = estimateProjection({ estimate, currentPosition: 0, today: TODAY })
    const withCapital = estimateProjection({ estimate: { ...estimate, startingCapital: 100000 }, currentPosition: 0, today: TODAY })
    expect(withCapital.years).toBeLessThan(without.years)
    expect(withCapital.current).toBe(100000)
  })

  it('falls back to the tracked position when no capital was stated', () => {
    const tracked = estimateProjection({ estimate, currentPosition: 100000, today: TODAY })
    const fromZero = estimateProjection({ estimate, currentPosition: 0, today: TODAY })
    expect(tracked.years).toBeLessThan(fromZero.years)
    expect(tracked.current).toBe(100000)
  })

  it('treats a stated capital of zero as no capital', () => {
    const stated = estimateProjection({ estimate: { ...estimate, startingCapital: 0 }, currentPosition: 50000, today: TODAY })
    const tracked = estimateProjection({ estimate, currentPosition: 50000, today: TODAY })
    expect(stated.years).toBe(tracked.years)
  })

  it('reports the goal as already reached when the capital covers it', () => {
    const projection = estimateProjection({ estimate: { ...estimate, startingCapital: 600000 }, currentPosition: 0, today: TODAY })
    expect(projection.reached).toBe(true)
    expect(projection.years).toBe(0)
  })
})

describe('compareGoal', () => {
  it('flags a goal that is short of what the spending implies', () => {
    const comparison = compareGoal({ goal: 300000, projected: 418700 })
    expect(comparison.enough).toBe(false)
    expect(comparison.cover).toBe(12000)
    expect(comparison.gap).toBe(118700)
  })

  it('accepts a goal that covers the spending', () => {
    expect(compareGoal({ goal: 500000, projected: 418700 }).enough).toBe(true)
  })

  it('treats an exact match as enough', () => {
    expect(compareGoal({ goal: 418700, projected: 418700 }).enough).toBe(true)
  })

  it('never claims to be enough without a projection to compare against', () => {
    expect(compareGoal({ goal: 300000, projected: 0 }).enough).toBe(false)
  })
})
