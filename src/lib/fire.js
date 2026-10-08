import { monthKey } from './dates.js'
import { roundMoney } from './money.js'
import { isInvestmentTransaction, isSavingsTransaction } from './portfolio.js'

/** The safe-withdrawal rate behind the "4% rule". */
export const WITHDRAWAL_RATE = 0.04

/** Assumed annual return above inflation for a balanced portfolio. */
export const REAL_RETURN = 0.05

/** At most this many months of history feed the averages. */
const MAX_WINDOW_MONTHS = 12

/** Money moved into an asset is saving, not spending. */
function isTransfer(item) {
  return isInvestmentTransaction(item) || isSavingsTransaction(item)
}

/**
 * Averages the last year of activity and annualises it.
 *
 * The divisor is the number of months that actually contain transactions, not
 * the number of months elapsed. A new account that has only entered one month
 * would otherwise be divided by two or three and report spending far below
 * reality — which would flatter the FIRE date, the opposite of what you want.
 *
 * Investment and savings transfers count as saving rather than spending, since
 * the 4% rule only has to cover living costs.
 */
export function annualAverages(transactions, today = new Date()) {
  const current = monthKey(today)
  const from = monthKey(new Date(today.getFullYear(), today.getMonth() - (MAX_WINDOW_MONTHS - 1), 1))

  const activeMonths = new Set()
  let income = 0
  let expenses = 0
  let saved = 0

  for (const item of transactions) {
    const month = item.date.slice(0, 7)
    if (month < from || month > current) continue
    activeMonths.add(month)
    if (item.type === 'income') income += item.amount
    else if (isTransfer(item)) saved += item.amount
    else expenses += item.amount
  }

  const months = Math.max(1, activeMonths.size)
  const scale = 12 / months
  return {
    months,
    income: roundMoney(income * scale),
    expenses: roundMoney(expenses * scale),
    saved: roundMoney(saved * scale),
    savings: roundMoney((income - expenses) * scale),
  }
}

/** The pot needed to cover annual spending at the safe withdrawal rate. */
export function fireTarget(annualExpenses, withdrawalRate = WITHDRAWAL_RATE) {
  if (!(annualExpenses > 0) || !(withdrawalRate > 0)) return 0
  return roundMoney(annualExpenses / withdrawalRate)
}

/**
 * Years until the pot reaches the target, allowing for growth on what is
 * already invested and for further contributions.
 *
 *   FV = PV(1+r)^n + PMT((1+r)^n - 1)/r   solved for n
 *
 * Returns null when it is never reached — no growth and no saving, or money
 * going out faster than it comes in.
 */
export function yearsToTarget({ current, annualSavings, target, realReturn = REAL_RETURN }) {
  if (!(target > 0)) return null
  if (current >= target) return 0

  if (realReturn <= 0) {
    if (annualSavings <= 0) return null
    return (target - current) / annualSavings
  }

  const offset = annualSavings / realReturn
  const ratio = (target + offset) / (current + offset)
  if (!(ratio > 1)) return null

  const years = Math.log(ratio) / Math.log(1 + realReturn)
  return Number.isFinite(years) && years > 0 ? years : null
}

/** Net worth year by year, assuming contributions arrive at the end of each year. */
export function projectSeries({ current, annualSavings, realReturn = REAL_RETURN, years }) {
  const points = []
  let value = current
  for (let year = 0; year <= years; year += 1) {
    points.push({ year, value: roundMoney(value) })
    value = value * (1 + realReturn) + annualSavings
  }
  return points
}

/** Shared tail: turns a set of annual figures into a full projection. */
function buildProjection({ income, expenses, savings, saved = 0, months, currentPosition, today, realReturn, withdrawalRate, estimated = false }) {
  const target = fireTarget(expenses, withdrawalRate)
  const reached = target > 0 && currentPosition >= target
  const years = yearsToTarget({ current: currentPosition, annualSavings: savings, target, realReturn })

  return {
    income,
    expenses,
    savings,
    saved,
    months,
    estimated,
    target,
    years,
    reached,
    realReturn,
    withdrawalRate,
    // A rough calendar date for the crossover, good to the month.
    targetDate: years == null ? null : new Date(today.getFullYear(), today.getMonth() + Math.ceil(years * 12), 1),
  }
}

/** Everything the FIRE page needs, derived from the transaction history. */
export function fireProjection({ transactions, currentPosition, today = new Date(), realReturn = REAL_RETURN, withdrawalRate = WITHDRAWAL_RATE }) {
  return buildProjection({ ...annualAverages(transactions, today), currentPosition, today, realReturn, withdrawalRate })
}

/**
 * A projection built from the answers given during onboarding, for use before
 * there is any transaction history worth averaging.
 */
export function estimateProjection({ estimate, currentPosition, today = new Date(), realReturn = REAL_RETURN, withdrawalRate = WITHDRAWAL_RATE }) {
  const income = Number(estimate?.income) || 0
  const expenses = Number(estimate?.spending) || 0
  const rate = Number(estimate?.savingsRate)
  // A stated savings rate wins; otherwise it is whatever income minus spending leaves.
  const savings = Number.isFinite(rate) && rate >= 0 ? roundMoney(income * (rate / 100)) : roundMoney(income - expenses)
  return buildProjection({ income, expenses, savings, saved: savings, months: 0, currentPosition, today, realReturn, withdrawalRate, estimated: true })
}

/**
 * How the goal the user set compares with the number their spending implies.
 * `cover` is what that goal pays out each year at the withdrawal rate.
 */
export function compareGoal({ goal, projected, withdrawalRate = WITHDRAWAL_RATE }) {
  const target = Number(goal) || 0
  return {
    goal: roundMoney(target),
    projected: roundMoney(projected),
    cover: roundMoney(target * withdrawalRate),
    gap: roundMoney(projected - target),
    enough: projected > 0 && target >= projected,
  }
}
