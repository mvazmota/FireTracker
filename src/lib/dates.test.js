import { describe, expect, it } from 'vitest'
import { dateForMonth, dateKey, formatMonthLabel, monthKey, normalizeTransactionDate, parseTransactionDate, timeStamp } from './dates.js'

describe('localeFor', () => {
  it('maps pt to pt-PT and everything else to en-IE', async () => {
    const { localeFor } = await import('./dates.js')
    expect(localeFor('pt')).toBe('pt-PT')
    expect(localeFor('en')).toBe('en-IE')
    expect(localeFor(undefined)).toBe('en-IE')
  })
})

describe('monthKey / dateKey', () => {
  it('zero-pads single-digit months and days', () => {
    expect(monthKey(new Date(2026, 0, 5))).toBe('2026-01')
    expect(dateKey(new Date(2026, 0, 5))).toBe('2026-01-05')
  })

  it('does not pad when already two digits', () => {
    expect(monthKey(new Date(2026, 11, 31))).toBe('2026-12')
    expect(dateKey(new Date(2026, 11, 31))).toBe('2026-12-31')
  })
})

describe('dateForMonth', () => {
  it('returns the first day of the month', () => {
    const result = dateForMonth(new Date(2026, 6, 23))
    expect(result.getFullYear()).toBe(2026)
    expect(result.getMonth()).toBe(6)
    expect(result.getDate()).toBe(1)
  })
})

describe('timeStamp', () => {
  it('formats a local timestamp with padded time parts', () => {
    expect(timeStamp(new Date(2026, 2, 4, 9, 5, 3))).toBe('2026-03-04T09:05:03')
  })
})

describe('normalizeTransactionDate', () => {
  it('upgrades a date-only value to midday', () => {
    expect(normalizeTransactionDate('2026-01-05')).toBe('2026-01-05T12:00:00')
  })

  it('adds seconds when only hours and minutes are present', () => {
    expect(normalizeTransactionDate('2026-01-05T09:30')).toBe('2026-01-05T09:30:00')
  })

  it('leaves a full timestamp untouched', () => {
    expect(normalizeTransactionDate('2026-01-05T09:30:45')).toBe('2026-01-05T09:30:45')
  })

  it('passes non-strings straight through', () => {
    expect(normalizeTransactionDate(null)).toBeNull()
    expect(normalizeTransactionDate(1234)).toBe(1234)
  })
})

describe('parseTransactionDate', () => {
  it('parses a normalized value into a Date', () => {
    const parsed = parseTransactionDate('2026-01-05')
    expect(parsed.getFullYear()).toBe(2026)
    expect(parsed.getMonth()).toBe(0)
    expect(parsed.getDate()).toBe(5)
    expect(parsed.getHours()).toBe(12)
  })
})

describe('formatMonthLabel', () => {
  it('renders a short month and two-digit year', () => {
    expect(formatMonthLabel('2026-01', 'en')).toMatch(/26/)
  })
})
