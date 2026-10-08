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

  it('pays a salary every month', () => {
    const salaries = payload.transactions.filter((item) => item.category === 'Salary')
    expect(salaries).toHaveLength(12)
    expect(salaries.every((item) => item.amount === 2000)).toBe(true)
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

  it('starts exactly a year ago', () => {
    expect(payload.transactions[0].date.slice(0, 7)).toBe('2025-11')
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
