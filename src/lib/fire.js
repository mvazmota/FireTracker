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

/** The months the averages look at: a rolling year, oldest first. */
function recentMonths(today) {
  return {
    from: monthKey(new Date(today.getFullYear(), today.getMonth() - (MAX_WINDOW_MONTHS - 1), 1)),
    current: monthKey(today),
  }
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
  const { from, current } = recentMonths(today)

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

/**
 * What each spending habit costs in pot terms.
 *
 * Every expense category is annualised over the same window the FIRE number
 * uses, then turned into the pot it needs at the plan's withdrawal rate. The
 * month count is what separates a habit from an occasional purchase: a category
 * present in every month is something you do, one present in two is something
 * that happened. Occasional spending is still spread across the year, which is
 * why a single holiday lands as a small monthly figure.
 */
export function spendingByCategory(transactions, plan, today = new Date()) {
  const { withdrawalRate } = normalizePlan(plan)
  const { from, current } = recentMonths(today)
  const found = new Map()
  const activeMonths = new Set()

  for (const item of transactions) {
    const month = item.date.slice(0, 7)
    if (month < from || month > current) continue
    if (item.type !== 'expense' || isTransfer(item)) continue
    activeMonths.add(month)
    const entry = found.get(item.category) || { category: item.category, total: 0, months: new Set() }
    entry.total += item.amount
    entry.months.add(month)
    found.set(item.category, entry)
  }

  const months = Math.max(1, activeMonths.size)
  const scale = 12 / months
  const categories = [...found.values()]
    .map((entry) => {
      const annual = roundMoney(entry.total * scale)
      return {
        category: entry.category,
        annual,
        monthly: roundMoney(annual / 12),
        months: entry.months.size,
        pot: fireTarget(annual, withdrawalRate),
      }
    })
    .sort((a, b) => b.annual - a.annual)

  const sumWhere = (test) => roundMoney(categories.filter(test).reduce((total, entry) => total + entry.monthly, 0))

  return {
    months,
    withdrawalRate,
    categories,
    // Spending present in every recorded month, against spending that comes and
    // goes. A statement about the records, not about what is essential: rent and
    // groceries both land here, and so does anything bought monthly.
    everyMonth: sumWhere((entry) => entry.months === months),
    occasional: sumWhere((entry) => entry.months < months),
  }
}

/**
 * What a change of habit would do to the horizon.
 *
 * Earning more and saving more give the same number on purpose: neither changes
 * the pot you need, only how fast you fill it. Spending less is worth more than
 * both, because the pot only has to cover what you spend — so it shrinks the
 * target as well as filling it faster. That asymmetry belongs to the withdrawal
 * rate, not to any opinion about what anyone should do.
 */
export function fireLevers({ current, annualSavings, annualSpending, target, realReturn = REAL_RETURN, withdrawalRate = WITHDRAWAL_RATE, monthly = 100 }) {
  const now = yearsToTarget({ current, annualSavings, target, realReturn })
  if (now == null || !(target > 0)) return null

  const step = monthly * 12
  const faster = yearsToTarget({ current, annualSavings: annualSavings + step, target, realReturn })
  const smallerTarget = fireTarget(Math.max(0, annualSpending - step), withdrawalRate)
  const leaner = yearsToTarget({ current, annualSavings: annualSavings + step, target: smallerTarget, realReturn })

  return {
    monthly,
    years: now,
    saveMore: faster == null ? null : now - faster,
    earnMore: faster == null ? null : now - faster,
    spendLess: leaner == null ? null : now - leaner,
    smallerTarget,
  }
}

/** The pot needed to cover annual spending at the safe withdrawal rate. */export function fireTarget(annualExpenses, withdrawalRate = WITHDRAWAL_RATE) {
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

/**
 * The year-to-year spread of a balanced portfolio's real return. The 4% rule is
 * built on roughly this much volatility, which is exactly what a single-number
 * projection hides.
 */
export const RETURN_VOLATILITY = 0.15

/** A small seeded generator (mulberry32), so a projection is reproducible. */
function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** One standard normal sample, by Box–Muller. */
function gaussian(random) {
  let u = 0
  while (u === 0) u = random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * random())
}

/** The value at a percentile of an unsorted list. */
function percentile(values, share) {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * share)))
  return sorted[index]
}

/**
 * Simulates many possible futures instead of assuming one average return.
 *
 * Returns the spread of the horizon rather than a single date, because the
 * order returns arrive in matters as much as their average. `p10`/`p90` bracket
 * the middle 80% of outcomes, and `successRate` is the share of runs that reach
 * the target within the simulated window.
 *
 * `within` narrows the deadline for those two without shortening the paths, so
 * the band can still run to the end of the chart while the odds answer "by the
 * date my plan predicts?".
 */
export function projectionRange({
  current = 0,
  annualSavings = 0,
  target = 0,
  realReturn = REAL_RETURN,
  volatility = RETURN_VOLATILITY,
  years = 40,
  within = null,
  samples = 800,
  seed = 1,
} = {}) {
  if (!(target > 0) || !(years > 0) || !(samples > 0)) {
    return { samples: 0, years, within: years, successRate: 0, p10: null, p50: null, p90: null, fastest: null, slowest: null }
  }

  const random = mulberry32(seed)
  const paths = []
  const reachedAt = []

  for (let sample = 0; sample < samples; sample += 1) {
    let value = current
    let reached = value >= target ? 0 : null
    const path = [value]

    for (let year = 1; year <= years; year += 1) {
      // The return is drawn fresh each year; the order of the draws is the point.
      value = value * (1 + realReturn + volatility * gaussian(random)) + annualSavings
      if (value < 0) value = 0
      path.push(value)
      if (reached == null && value >= target) reached = year
    }

    paths.push(path)
    reachedAt.push(reached)
  }

  const deadline = Number.isFinite(within) && within > 0 ? Math.min(within, years) : years
  // The spread covers every run that gets there inside the simulated window;
  // the odds only count the ones that make the deadline.
  const reached = reachedAt.filter((year) => year != null)
  const inTime = reached.filter((year) => year <= deadline)
  const band = []
  for (let year = 0; year <= years; year += 1) {
    band.push({
      year,
      p10: roundMoney(percentile(paths.map((path) => path[year]), 0.1)),
      p50: roundMoney(percentile(paths.map((path) => path[year]), 0.5)),
      p90: roundMoney(percentile(paths.map((path) => path[year]), 0.9)),
    })
  }

  return {
    samples,
    years,
    within: deadline,
    successRate: inTime.length / samples,
    fastest: reached.length ? Math.min(...reached) : null,
    slowest: reached.length ? Math.max(...reached) : null,
    p10: percentile(reached, 0.1),
    p50: percentile(reached, 0.5),
    p90: percentile(reached, 0.9),
    band,
  }
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
