import { dateKey, monthKey } from '../dates.js'
import { occurrenceFor, pendingMonths } from '../recurring.js'
import { btcPriceAt, threeYearSimulation } from '../simulation.js'

/** A deterministic wobble in [-spread, spread], stable for a given seed. */
function wobble(seed, spread = 0) {
  if (!spread) return 0
  const fraction = Math.abs(Math.sin(seed * 12.9898) * 43758.5453) % 1
  return Math.round((fraction * 2 - 1) * spread * 100) / 100
}

/** The price of an investment line in a given month. */
function priceFor(line, index) {
  // Bitcoin follows the volatile curve the showcase simulation uses; anything
  // else drifts up in a nearly straight line.
  if (line.curve === 'crypto') return btcPriceAt(index)
  return line.price + index * line.drift + Math.sin(index * 0.7) * line.wobble
}

const PURCHASE_LABELS = { etf: 'ETF purchase', crypto: 'Crypto purchase' }

/** Which holding array each investment type belongs to. */
const HOLDING_TABLES = { etf: 'etfs', crypto: 'crypto' }

/** The visibility flags a persona's investments imply. */
function visibilityFor(persona) {
  const keys = { etf: 'etfs', crypto: 'crypto', p2p: 'p2p', bond: 'bonds', savings: 'savings' }
  const used = new Set((persona.investments || []).map((line) => keys[line.type]))
  return { etfs: used.has('etfs'), crypto: used.has('crypto'), p2p: used.has('p2p'), bonds: used.has('bonds'), savings: used.has('savings') }
}

/** The three-year showcase account, straight from the original simulation. */
function establishedPayload(today) {
  const simulation = threeYearSimulation()
  return {
    transactions: simulation.transactions,
    etfs: simulation.etfs,
    crypto: simulation.crypto,
    p2p: simulation.p2p,
    bonds: simulation.bonds,
    savings: simulation.savings,
    recurring: [],
    profile: { name: 'Demo', avatar: '', createdAt: dateKey(today) },
    settings: {
      language: 'en',
      fireMeterVisible: true,
      investmentVisibility: { etfs: true, crypto: true, p2p: true, bonds: true, savings: true },
      platforms: ['Bank account', 'Cash', 'Trade Republic', 'Interactive Brokers', 'DEGIRO', 'Coinbase', 'Banco Invest', 'Caixa Geral'],
      categories: {
        expense: ['Food & dining', 'Investment', 'Savings', 'Transport', 'Housing', 'Health', 'Entertainment', 'Jardim'],
        income: ['Salary', 'Freelance', 'Gift', 'Other'],
      },
      onboarded: true,
    },
  }
}

/**
 * Turns a persona into a history of transactions and the holdings they build.
 *
 * Everything is derived from the persona's own figures, and every value that
 * should vary month to month comes from a seed rather than `Math.random`, so the
 * same persona always produces the same history.
 */
function personaPayload(persona, today) {
  const months = persona.months
  const first = new Date(today.getFullYear(), today.getMonth() - (months - 1), 1)
  const transactions = []
  const defaultPlatform = persona.platforms[0]
  const recurring = []
  // Bonus income paid in each month, so an investment can take a share of it.
  const bonusByMonth = {}

  const positions = (persona.investments || []).map((line) => ({
    line,
    units: 0,
    invested: 0,
    price: priceFor(line, 0),
    history: [],
  }))

  // A recurring income line becomes a rule plus the months it has already
  // produced, so the app's own generator carries on from there rather than the
  // history stopping at the last seeded month.
  for (const line of (persona.income || []).filter((item) => item.recurring)) {
    const rule = {
      id: `demo-${persona.id}-${line.key}`,
      title: line.title,
      category: line.category,
      type: 'income',
      amount: line.amount,
      platform: line.platform || defaultPlatform,
      dayOfMonth: line.day,
      startMonth: monthKey(first),
      lastGeneratedMonth: null,
      active: true,
    }
    const due = pendingMonths(rule, today)
    for (const month of due) transactions.push({ ...occurrenceFor(rule, month), isDemo: true })
    rule.lastGeneratedMonth = due.length ? due[due.length - 1] : null
    recurring.push(rule)
  }

  for (let index = 0; index < months; index += 1) {
    const date = new Date(first.getFullYear(), first.getMonth() + index, 1)
    const month = monthKey(date)
    const seed = date.getFullYear() * 12 + date.getMonth()
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
    const isCurrentMonth = month === monthKey(today)
    const winter = [10, 11, 0, 1, 2].includes(date.getMonth())

    /** Adds one row, unless the day has not arrived yet in the current month. */
    function add(line, day, amount, suffix = '') {
      if (day > lastDay || (isCurrentMonth && day > today.getDate())) return false
      const hour = 8 + ((seed + line.key.length * 7) % 12)
      const minute = (seed * 7 + Math.round(amount)) % 60
      transactions.push({
        id: `demo-${persona.id}-${month}-${line.key}${suffix}`,
        title: line.title,
        category: line.category,
        type: line.type,
        amount: Math.round(amount * 100) / 100,
        date: `${month}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`,
        platform: line.platform || defaultPlatform,
        isDemo: true,
      })
      return true
    }

    // Income that is not recurring: bonuses and allowances.
    for (const line of (persona.income || []).filter((item) => !item.recurring)) {
      if (line.months && !line.months.includes(date.getMonth())) continue
      if (add({ ...line, type: 'income' }, line.day, line.amount) && line.bonus) {
        bonusByMonth[month] = (bonusByMonth[month] || 0) + line.amount
      }
    }

    for (const line of persona.expenses || []) {
      if (line.months && !line.months.includes(date.getMonth())) continue
      const days = line.days || [line.day]
      days.forEach((day, occurrence) => {
        const seasonal = line.seasonal && winter ? 1.35 : 1
        const amount = line.amount * seasonal + wobble(seed + occurrence * 31 + line.key.length, line.spread)
        add({ ...line, type: 'expense' }, day, amount, line.days ? `-${occurrence}` : '')
      })
    }

    // Investments leave cash and become units, either monthly or as a share of
    // whatever bonus landed that month.
    for (const position of positions) {
      const { line } = position
      position.price = priceFor(line, index)
      const amount = line.monthly ?? (line.onBonus ? (bonusByMonth[month] || 0) * line.onBonus : 0)
      if (amount > 0) {
        const purchase = { key: `buy-${line.id}`, title: `${PURCHASE_LABELS[line.type]} · ${line.symbol}`, category: 'Investment', type: 'expense', platform: line.platform }
        if (add(purchase, line.day, amount)) {
          position.units += amount / position.price
          position.invested += amount
        }
      }
      position.history.push({ month, value: Math.round(position.units * position.price * 100) / 100, invested: position.invested })
    }
  }

  // Only unit-based holdings are built. Loans, bonds and savings accounts carry
  // different fields, so a persona wanting those needs this extended first.
  const holdings = { etfs: [], crypto: [], p2p: [], bonds: [], savings: [] }
  for (const position of positions) {
    const table = HOLDING_TABLES[position.line.type]
    if (!table || !(position.units > 0)) continue
    holdings[table].push({
      id: position.line.id,
      symbol: position.line.symbol,
      name: position.line.name,
      platform: position.line.platform,
      units: position.units,
      averageCost: position.invested / position.units,
      currentPrice: Math.round(position.price * 100) / 100,
      history: position.history,
      isDemo: true,
    })
  }

  // What the persona already had. Dated a month before the tracked history so it
  // counts as cash without being read as income by the FIRE averages.
  if (persona.openingBalance) {
    const line = persona.openingBalance
    const before = monthKey(new Date(first.getFullYear(), first.getMonth() - 1, 1))
    transactions.push({
      id: `demo-${persona.id}-opening-balance`,
      title: line.title,
      category: line.category,
      type: 'income',
      amount: line.amount,
      date: `${before}-01T09:00:00`,
      platform: line.platform || defaultPlatform,
      isDemo: true,
    })
  }

  return {
    transactions: transactions.sort((a, b) => a.date.localeCompare(b.date)),
    ...holdings,
    recurring,
    profile: { name: persona.name, avatar: '', createdAt: dateKey(first) },
    settings: {
      language: 'en',
      fireMeterVisible: true,
      investmentVisibility: visibilityFor(persona),
      platforms: persona.platforms,
      categories: persona.categories,
      onboarded: true,
      birthYear: persona.birthYear ?? null,
      country: persona.country ?? null,
      firePlan: persona.plan ?? null,
    },
  }
}

/** The payload a persona is seeded with. */
export function buildDemoPayload(persona, today = new Date()) {
  return persona.shape === 'established' ? establishedPayload(today) : personaPayload(persona, today)
}
