import { monthKey } from './dates.js'
import { roundMoney } from './money.js'
import { isInvestmentTransaction, isSavingsTransaction } from './portfolio.js'

/** The safe-withdrawal rate behind the "4% rule". */
export const WITHDRAWAL_RATE = 0.04

/** Assumed annual return above inflation for a balanced portfolio. */
export const REAL_RETURN = 0.05

/** At most this many months of history feed the averages. */
const MAX_WINDOW_MONTHS = 12

/** The strategies a FIRE plan can follow. */
export const FIRE_STRATEGIES = ['traditional', 'lean', 'fat', 'barista', 'custom']

/** A plan that reproduces the plain 4% rule. */
export const DEFAULT_FIRE_PLAN = {
  strategy: 'traditional',
  withdrawalRate: WITHDRAWAL_RATE,
  // null means "use whatever the user's spending works out to".
  retirementSpending: null,
  postFireIncome: 0,
  realReturn: REAL_RETURN,
}

/** How far lean and fat FIRE move the retirement spending target. */
const LEAN_SPENDING_FACTOR = 0.75
const FAT_SPENDING_FACTOR = 1.5

/** Semi-retired assumes this share of today's income keeps coming in. */
const BARISTA_INCOME_FACTOR = 0.25

/**
 * The plan a strategy starts from. Each strategy moves a single lever, so it
 * stays clear which number changed and why: lean and fat move the retirement
 * spending target, semi-retired assumes some income after FIRE, and traditional
 * is the plain 4% rule.
 */
export function planForStrategy(strategy, { annualSpending = 0, annualIncome = 0 } = {}) {
  const base = { ...DEFAULT_FIRE_PLAN, strategy }
  const spending = Number(annualSpending) > 0 ? Number(annualSpending) : 0
  const income = Number(annualIncome) > 0 ? Number(annualIncome) : 0

  if (strategy === 'lean' && spending > 0) return { ...base, retirementSpending: roundMoney(spending * LEAN_SPENDING_FACTOR) }
  if (strategy === 'fat' && spending > 0) return { ...base, retirementSpending: roundMoney(spending * FAT_SPENDING_FACTOR) }
  if (strategy === 'barista' && income > 0) return { ...base, postFireIncome: roundMoney(income * BARISTA_INCOME_FACTOR) }
  return base
}

/** Clamps a stored plan into something the maths can trust. */
export function normalizePlan(plan) {
  const rate = Number(plan?.withdrawalRate)
  const growth = Number(plan?.realReturn)
  const spending = Number(plan?.retirementSpending)
  const income = Number(plan?.postFireIncome)

  return {
    strategy: FIRE_STRATEGIES.includes(plan?.strategy) ? plan.strategy : DEFAULT_FIRE_PLAN.strategy,
    withdrawalRate: rate > 0 && rate < 1 ? rate : WITHDRAWAL_RATE,
    retirementSpending: Number.isFinite(spending) && spending > 0 ? spending : null,
    postFireIncome: Number.isFinite(income) && income > 0 ? income : 0,
    realReturn: growth >= 0 && growth < 1 ? growth : REAL_RETURN,
  }
}

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

/** Shared tail: turns a set of annual figures and a plan into a projection. */
function buildProjection({ income, expenses, savings, saved = 0, months, currentPosition, plan, today, estimated = false }) {
  const { strategy, withdrawalRate, retirementSpending, postFireIncome, realReturn } = normalizePlan(plan)
  // The pot only has to cover what the retirement spending leaves uncovered.
  const spendingTarget = retirementSpending ?? expenses
  const spendingToCover = Math.max(0, roundMoney(spendingTarget - postFireIncome))
  const target = fireTarget(spendingToCover, withdrawalRate)
  const reached = target > 0 && currentPosition >= target
  const years = yearsToTarget({ current: currentPosition, annualSavings: savings, target, realReturn })

  return {
    income,
    expenses,
    savings,
    saved,
    months,
    estimated,
    // The position the projection starts from, so screens can show progress
    // against the same figure the horizon was worked out from.
    current: currentPosition,
    strategy,
    withdrawalRate,
    realReturn,
    retirementSpending: spendingTarget,
    postFireIncome,
    spendingToCover,
    target,
    years,
    reached,
    // A rough calendar date for the crossover, good to the month.
    targetDate: years == null ? null : new Date(today.getFullYear(), today.getMonth() + Math.ceil(years * 12), 1),
  }
}

/** Everything the FIRE page needs, derived from the transaction history. */
export function fireProjection({ transactions, currentPosition, plan, today = new Date() }) {
  return buildProjection({ ...annualAverages(transactions, today), currentPosition, plan, today })
}

/**
 * A projection built from the answers given during onboarding, for use before
 * there is any transaction history worth averaging.
 */
export function estimateProjection({ estimate, currentPosition = 0, plan, today = new Date() }) {
  const income = Number(estimate?.income) || 0
  const expenses = Number(estimate?.spending) || 0
  const rate = Number(estimate?.savingsRate)
  // A stated savings rate wins; otherwise it is whatever income minus spending leaves.
  const savings = Number.isFinite(rate) && rate >= 0 ? roundMoney(income * (rate / 100)) : roundMoney(income - expenses)
  return buildProjection({ income, expenses, savings, saved: savings, months: 0, currentPosition, plan, today, estimated: true })
}

/**
 * The onboarding FIRE calculator: turns what the user types into the figures
 * that step shows. Spending is entered per month and annualised here, and the
 * net worth is only a starting point for the projected timeline — it is never
 * stored, because the FIRE tab projects from tracked data instead.
 */
export function fireCalculator({ income = 0, monthlySpending = 0, netWorth = 0, realReturn = REAL_RETURN, withdrawalRate = WITHDRAWAL_RATE }) {
  const annualIncome = Number(income) || 0
  const annualSpending = (Number(monthlySpending) || 0) * 12
  const startingNetWorth = Number(netWorth) || 0
  const target = fireTarget(annualSpending, withdrawalRate)
  // Income and spending are both needed before the pace of saving means anything.
  const canProject = target > 0 && annualIncome > 0
  const savings = canProject ? roundMoney(annualIncome - annualSpending) : 0
  const savingsRate = canProject ? (savings / annualIncome) * 100 : 0
  const years = canProject ? yearsToTarget({ current: startingNetWorth, annualSavings: savings, target, realReturn }) : null
  const covered = target > 0 ? Math.min(100, (startingNetWorth / target) * 100) : 0

  return { annualIncome, annualSpending, netWorth: startingNetWorth, target, savings, savingsRate, years, covered, canProject }
}
