import { describe, expect, it } from 'vitest'
import { dayHasPassed, daysInMonth, dueOccurrences, nextMonth, occurrenceFor, pendingMonths, startMonthFor } from './recurring.js'

const rule = (overrides = {}) => ({ id: 'r1', title: 'Rent', category: 'Housing', type: 'expense', amount: 750, dayOfMonth: 1, startMonth: '2026-04', lastGeneratedMonth: null, active: true, ...overrides })

describe('daysInMonth', () => {
  it('knows the length of each month', () => {
    expect(daysInMonth('2026-01')).toBe(31)
    expect(daysInMonth('2026-04')).toBe(30)
    expect(daysInMonth('2026-02')).toBe(28)
  })

  it('handles leap years', () => {
    expect(daysInMonth('2024-02')).toBe(29)
    expect(daysInMonth('2100-02')).toBe(28)
  })
})

describe('nextMonth', () => {
  it('rolls over the year', () => {
    expect(nextMonth('2026-01')).toBe('2026-02')
    expect(nextMonth('2026-11')).toBe('2026-12')
    expect(nextMonth('2026-12')).toBe('2027-01')
  })
})

describe('dayHasPassed', () => {
  it('compares against today, clamped to the month length', () => {
    expect(dayHasPassed(1, new Date(2026, 5, 20))).toBe(true)
    expect(dayHasPassed(25, new Date(2026, 5, 20))).toBe(false)
    expect(dayHasPassed(20, new Date(2026, 5, 20))).toBe(false)
    // Day 31 in a 30-day month is clamped to the 30th, so the 30th is still "today".
    expect(dayHasPassed(31, new Date(2026, 5, 30))).toBe(false)
    // A 31st is the last day of a 31-day month, so it never counts as passed.
    expect(dayHasPassed(31, new Date(2026, 6, 31))).toBe(false)
    expect(dayHasPassed(30, new Date(2026, 6, 31))).toBe(true)
  })
})

describe('startMonthFor', () => {
  it('starts this month when the day is still ahead', () => {
    expect(startMonthFor(25, new Date(2026, 5, 20))).toBe('2026-06')
  })

  it('starts next month when the day has gone by, so nothing is back-dated', () => {
    expect(startMonthFor(1, new Date(2026, 5, 20))).toBe('2026-07')
  })

  it('still counts today', () => {
    expect(startMonthFor(20, new Date(2026, 5, 20))).toBe('2026-06')
  })
})

describe('pendingMonths', () => {
  it('returns every month from the start up to now, oldest first', () => {
    expect(pendingMonths(rule(), new Date(2026, 5, 20))).toEqual(['2026-04', '2026-05', '2026-06'])
  })

  it('picks up where it left off', () => {
    expect(pendingMonths(rule({ lastGeneratedMonth: '2026-05' }), new Date(2026, 5, 20))).toEqual(['2026-06'])
  })

  it('is empty once up to date', () => {
    expect(pendingMonths(rule({ lastGeneratedMonth: '2026-06' }), new Date(2026, 5, 20))).toEqual([])
  })

  it('waits until the day arrives before generating the current month', () => {
    expect(pendingMonths(rule({ startMonth: '2026-06', dayOfMonth: 25 }), new Date(2026, 5, 20))).toEqual([])
  })

  it('ignores paused rules', () => {
    expect(pendingMonths(rule({ active: false }), new Date(2026, 5, 20))).toEqual([])
  })

  it('ignores rules that start in the future', () => {
    expect(pendingMonths(rule({ startMonth: '2026-09' }), new Date(2026, 5, 20))).toEqual([])
  })

  it('catches up on several missed months at once', () => {
    expect(pendingMonths(rule({ startMonth: '2026-01', lastGeneratedMonth: '2026-02' }), new Date(2026, 5, 20))).toEqual(['2026-03', '2026-04', '2026-05', '2026-06'])
  })
})

describe('occurrenceFor', () => {
  it('builds a deterministic, fully-formed transaction', () => {
    expect(occurrenceFor(rule(), '2026-05')).toEqual({
      id: 'recurring-r1-2026-05',
      title: 'Rent',
      category: 'Housing',
      type: 'expense',
      amount: 750,
      date: '2026-05-01T09:00:00',
      platform: '',
      sourceType: 'recurring',
      sourceId: 'r1-2026-05',
    })
  })

  it('clamps the day to the length of the month', () => {
    expect(occurrenceFor(rule({ dayOfMonth: 31 }), '2026-02').date).toBe('2026-02-28T09:00:00')
    expect(occurrenceFor(rule({ dayOfMonth: 31 }), '2026-04').date).toBe('2026-04-30T09:00:00')
  })

  it('rounds the amount to cents', () => {
    expect(occurrenceFor(rule({ amount: 123.456 }), '2026-05').amount).toBe(123.46)
  })
})

describe('dueOccurrences', () => {
  it('collects across rules and reports which month each came from', () => {
    const rules = [
      rule({ id: 'rent', startMonth: '2026-05', dayOfMonth: 1 }),
      rule({ id: 'salary', title: 'Salary', type: 'income', startMonth: '2026-05', dayOfMonth: 25 }),
    ]
    const due = dueOccurrences(rules, new Date(2026, 5, 20))

    // Both rules started in May, so May is due for each. June is due for rent
    // (the 1st has passed) but not for salary, whose day is the 25th.
    expect(due.map((item) => `${item.ruleId}:${item.month}`)).toEqual(['rent:2026-05', 'rent:2026-06', 'salary:2026-05'])
    expect(due.every((item) => item.transaction.id === `recurring-${item.ruleId}-${item.month}`)).toBe(true)
  })

  it('returns nothing when there are no rules', () => {
    expect(dueOccurrences([], new Date(2026, 5, 20))).toEqual([])
  })
})
