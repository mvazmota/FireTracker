import { describe, expect, it } from 'vitest'
import { buildDemoPayload } from './build.js'
import { demoPersonaFor } from './personas.js'

const TODAY = new Date(2026, 9, 8)
const tiago = demoPersonaFor('tiago@email.com')

describe('demoPersonaFor', () => {
  it('finds a persona by email, ignoring case', () => {
    expect(demoPersonaFor('TIAGO@email.com')?.id).toBe('just-started')
  })

  it('returns null for a real account', () => {
    expect(demoPersonaFor('someone@example.com')).toBeNull()
    expect(demoPersonaFor(undefined)).toBeNull()
  })
})

describe('buildDemoPayload for a described persona', () => {
  const payload = buildDemoPayload(tiago, TODAY)

  it('pays a salary every month, produced by the recurring rule', () => {
    const salaries = payload.transactions.filter((item) => item.category === 'Salary')
    expect(salaries).toHaveLength(12)
    expect(salaries.every((item) => item.amount === 2000)).toBe(true)
    expect(salaries.every((item) => item.sourceType === 'recurring')).toBe(true)
    expect(salaries.every((item) => item.id.startsWith('recurring-demo-just-started-salary-'))).toBe(true)
  })

  it('seeds the rule so the app keeps paying it from here', () => {
    expect(payload.recurring).toHaveLength(1)
    const [rule] = payload.recurring
    expect(rule.type).toBe('income')
    expect(rule.amount).toBe(2000)
    expect(rule.dayOfMonth).toBe(1)
    expect(rule.startMonth).toBe('2025-11')
    expect(rule.lastGeneratedMonth).toBe('2026-10')
  })

  it('starts him with the balance he already had', () => {
    const opening = payload.transactions.filter((item) => item.title === 'Opening balance')
    expect(opening).toHaveLength(1)
    expect(opening[0].amount).toBe(10000)
    expect(opening[0].type).toBe('income')
    // A month before the tracked year, so it reads as cash rather than income.
    expect(opening[0].date.slice(0, 7)).toBe('2025-10')
  })

  it('pays the rent every month, unchanged', () => {
    const rent = payload.transactions.filter((item) => item.title === 'Rent')
    expect(rent).toHaveLength(12)
    expect(rent.every((item) => item.amount === 750)).toBe(true)
  })

  it('buys games only in the months the hobby allows', () => {
    const games = payload.transactions.filter((item) => item.title === 'Game purchase')
    expect(games.length).toBeGreaterThan(0)
    expect(games.length).toBeLessThanOrEqual(6)
  })

  it('invests 200 a month and grows a holding from it', () => {
    const buys = payload.transactions.filter((item) => item.category === 'Investment')
    expect(buys).toHaveLength(12)
    expect(buys.every((item) => item.amount === 200)).toBe(true)
    expect(payload.etfs).toHaveLength(1)
    expect(payload.etfs[0].symbol).toBe('VUAA')
    expect(payload.etfs[0].units).toBeGreaterThan(0)
    expect(payload.etfs[0].history).toHaveLength(12)
    expect(payload.etfs[0].averageCost).toBeGreaterThan(0)
  })

  it('spends about what the persona describes', () => {
    const spending = payload.transactions.filter((item) => item.type === 'expense' && item.category !== 'Investment')
    const monthly = spending.reduce((sum, item) => sum + item.amount, 0) / 12
    expect(monthly).toBeGreaterThan(1300)
    expect(monthly).toBeLessThan(1600)
  })

  it('carries the persona into the settings', () => {
    expect(payload.settings.birthYear).toBe(2004)
    expect(payload.settings.country).toBe('PT')
    expect(payload.settings.firePlan.strategy).toBe('traditional')
    expect(payload.settings.onboarded).toBe(true)
    expect(payload.settings.categories.expense).toContain('Investment')
  })

  it('is stable for the same day', () => {
    const again = buildDemoPayload(tiago, TODAY)
    expect(again.transactions.map((item) => item.amount)).toEqual(payload.transactions.map((item) => item.amount))
    expect(again.etfs[0].units).toBe(payload.etfs[0].units)
  })

  it('never dates a transaction in the future', () => {
    expect(payload.transactions.every((item) => item.date.slice(0, 10) <= '2026-10-08')).toBe(true)
  })

  it('starts the tracked year exactly a year ago', () => {
    const salaries = payload.transactions.filter((item) => item.category === 'Salary')
    expect(salaries[0].date.slice(0, 7)).toBe('2025-11')
  })
})

describe('buildDemoPayload for a seasonal persona', () => {
  const diogo = demoPersonaFor('diogo@email.com')
  const payload = buildDemoPayload(diogo, TODAY)

  it('covers three years', () => {
    expect(new Set(payload.transactions.map((item) => item.date.slice(0, 7))).size).toBe(36)
  })

  it('pays a salary every month, from the rule', () => {
    const salaries = payload.transactions.filter((item) => item.title === 'Monthly salary')
    expect(salaries).toHaveLength(36)
    expect(salaries.every((item) => item.amount === 2200)).toBe(true)
    expect(salaries.every((item) => item.sourceType === 'recurring')).toBe(true)
    expect(payload.recurring).toHaveLength(1)
    expect(payload.recurring[0].lastGeneratedMonth).toBe('2026-10')
  })

  it('pays an allowance every six months', () => {
    const allowances = payload.transactions.filter((item) => /allowance/.test(item.title))
    expect(allowances).toHaveLength(6)
    expect(allowances.every((item) => item.amount === 2200)).toBe(true)
  })

  it('invests 400 a month in the ETF', () => {
    const buys = payload.transactions.filter((item) => item.title === 'ETF purchase · VUAA')
    expect(buys).toHaveLength(36)
    expect(buys.every((item) => item.amount === 400)).toBe(true)
  })

  it('buys bitcoin with half of every allowance', () => {
    const buys = payload.transactions.filter((item) => item.title === 'Crypto purchase · BTC-EUR')
    expect(buys).toHaveLength(6)
    expect(buys.every((item) => item.amount === 1100)).toBe(true)
  })

  it('holds both an ETF and bitcoin', () => {
    expect(payload.etfs).toHaveLength(1)
    expect(payload.crypto).toHaveLength(1)
    expect(payload.crypto[0].units).toBeGreaterThan(0)
    expect(payload.crypto[0].history).toHaveLength(36)
    expect(payload.settings.investmentVisibility.crypto).toBe(true)
    expect(payload.settings.investmentVisibility.p2p).toBe(false)
  })

  it('prices bitcoin on its own curve rather than an ETF one', () => {
    expect(payload.crypto[0].currentPrice).toBeGreaterThan(20000)
  })

  it('lets the saving rate swing across the year', () => {
    const byMonth = {}
    for (const item of payload.transactions) {
      const month = item.date.slice(0, 7)
      byMonth[month] = byMonth[month] || { income: 0, spending: 0 }
      if (item.type === 'income') byMonth[month].income += item.amount
      else if (item.category !== 'Investment') byMonth[month].spending += item.amount
    }
    const rates = Object.values(byMonth).filter((month) => month.income > 0).map((month) => (month.income - month.spending) / month.income)
    expect(Math.max(...rates) - Math.min(...rates)).toBeGreaterThan(0.3)
  })
})

describe('buildDemoPayload for the showcase persona', () => {
  it('still returns the three-year simulation', () => {
    const payload = buildDemoPayload(demoPersonaFor('demo@email.com'), TODAY)
    expect(payload.transactions.length).toBeGreaterThan(500)
    expect(payload.etfs).toHaveLength(1)
    expect(payload.savings).toHaveLength(1)
    expect(payload.settings.onboarded).toBe(true)
  })
})
