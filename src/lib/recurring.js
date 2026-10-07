import { monthKey } from './dates.js'
import { roundMoney } from './money.js'

/** Number of days in a 'YYYY-MM' month, accounting for leap years. */
export function daysInMonth(month) {
  return new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate()
}

/** The 'YYYY-MM' that follows the given one. */
export function nextMonth(month) {
  return monthKey(new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 1))
}

/** Whether this month's occurrence day has already gone by. */
export function dayHasPassed(day, today) {
  return today.getDate() > Math.min(day, daysInMonth(monthKey(today)))
}

/**
 * The month a brand new rule starts from: this month when its day is still to
 * come, otherwise next month. Adding a rule therefore never creates a
 * back-dated transaction the user has most likely already entered by hand.
 */
export function startMonthFor(day, today) {
  return dayHasPassed(day, today) ? nextMonth(monthKey(today)) : monthKey(today)
}

/**
 * The months still to materialise for a rule, oldest first. Empty once the rule
 * is up to date, so calling this repeatedly is harmless.
 */
export function pendingMonths(rule, today) {
  if (rule.active === false) return []
  const current = monthKey(today)
  if (!rule.startMonth || rule.startMonth > current) return []

  const dueDay = Math.min(rule.dayOfMonth, daysInMonth(current))
  const months = []
  let month = rule.lastGeneratedMonth ? nextMonth(rule.lastGeneratedMonth) : rule.startMonth

  while (month <= current) {
    // The current month only counts once its day has arrived.
    if (month === current && today.getDate() < dueDay) break
    months.push(month)
    month = nextMonth(month)
  }
  return months
}

/** The transaction a rule produces for a given month. */
export function occurrenceFor(rule, month) {
  const day = Math.min(rule.dayOfMonth, daysInMonth(month))
  return {
    id: `recurring-${rule.id}-${month}`,
    title: rule.title,
    category: rule.category,
    type: rule.type,
    amount: roundMoney(rule.amount),
    date: `${month}-${String(day).padStart(2, '0')}T09:00:00`,
    platform: rule.platform || '',
    sourceType: 'recurring',
    sourceId: `${rule.id}-${month}`,
  }
}

/**
 * Every occurrence that should exist by `today`, across all rules. Ids are
 * deterministic, so writing these again can never create a duplicate.
 */
export function dueOccurrences(rules, today) {
  const occurrences = []
  for (const rule of rules) {
    for (const month of pendingMonths(rule, today)) {
      occurrences.push({ ruleId: rule.id, month, transaction: occurrenceFor(rule, month) })
    }
  }
  return occurrences
}
