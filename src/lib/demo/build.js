import { dateKey, monthKey } from '../dates.js'
import { occurrenceFor, pendingMonths } from '../recurring.js'
import { threeYearSimulation } from '../simulation.js'

/** A deterministic wobble in [-spread, spread], stable for a given seed. */
function wobble(seed, spread = 0) {
  if (!spread) return 0
  const fraction = Math.abs(Math.sin(seed * 12.9898) * 43758.5453) % 1
  return Math.round((fraction * 2 - 1) * spread * 100) / 100
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
 * Turns a persona into a year of transactions and the holdings they build.
 *
 * Everything is derived from the persona's own figures, and every value that
 * should vary month to month is derived from a seed rather than `Math.random`,
 * so the same persona always produces the same history.
 */
function personaPayload(persona, today) {
  const months = persona.months
  const first = new Date(today.getFullYear(), today.getMonth() - (months - 1), 1)
  const transactions = []
  const defaultPlatform = persona.platforms[0]

  // One accumulator per investment line: units bought, cash in, and the value
  // recorded at the end of each month.
  const positions = (persona.investments || []).map((line) => ({
    line,
    units: 0,
    invested: 0,
    price: line.price,
    history: [],
  }))

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

    for (const line of persona.expenses || []) {
      if (line.months && !line.months.includes(date.getMonth())) continue
      const days = line.days || [line.day]
      days.forEach((day, occurrence) => {
        const seasonal = line.seasonal && winter ? 1.35 : 1
        const amount = line.amount * seasonal + wobble(seed + occurrence * 31 + line.key.length, line.spread)
        add({ ...line, type: 'expense' }, day, amount, line.days ? `-${occurrence}` : '')
      })
    }

    // Investments leave cash and become units. The price path drifts up with a
    // little wobble, so the cost basis and the market value differ the way they
    // would in real life.
    for (const position of positions) {
      const { line } = position
      position.price = line.price + index * line.drift + Math.sin(index * 0.7) * line.wobble
      const purchase = { key: `buy-${line.id}`, title: `ETF purchase · ${line.symbol}`, category: 'Investment', type: 'expense', platform: line.platform }
      if (add(purchase, line.day, line.monthly)) {
        position.units += line.monthly / position.price
        position.invested += line.monthly
      }
      position.history.push({ month, value: Math.round(position.units * position.price * 100) / 100, invested: position.invested })
    }
  }

  // The salary comes from a rule rather than rows written here. Seeding the rule
  // and the months it has already produced means the app's own generator picks
  // up from the last one and keeps paying it in the months that follow, so the
  // demo exercises the recurring feature instead of faking it.
  const recurring = []
  for (const line of persona.recurring || []) {
    const rule = {
      id: `demo-${persona.id}-${line.key}`,
      title: line.title,
      category: line.category,
      type: line.type,
      amount: line.amount,
      platform: line.platform || defaultPlatform,
      dayOfMonth: line.dayOfMonth,
      startMonth: monthKey(first),
      lastGeneratedMonth: null,
      active: true,
    }
    const months = pendingMonths(rule, today)
    for (const month of months) transactions.push({ ...occurrenceFor(rule, month), isDemo: true })
    rule.lastGeneratedMonth = months.length ? months[months.length - 1] : null
    recurring.push(rule)
  }

  // What he already had. Dated a month before the tracked year so it counts as
  // cash without being read as income by the FIRE averages.
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

  const etfs = positions
    .filter((position) => position.line.type === 'etf' && position.units > 0)
    .map((position) => ({
      id: position.line.id,
      symbol: position.line.symbol,
      name: position.line.name,
      platform: position.line.platform,
      units: position.units,
      averageCost: position.invested / position.units,
      currentPrice: Math.round(position.price * 100) / 100,
      history: position.history,
      isDemo: true,
    }))

  return {
    transactions: transactions.sort((a, b) => a.date.localeCompare(b.date)),
    etfs,
    crypto: [],
    p2p: [],
    bonds: [],
    savings: [],
    recurring,
    profile: { name: persona.name, avatar: '', createdAt: dateKey(first) },
    settings: {
      language: 'en',
      fireMeterVisible: true,
      investmentVisibility: { etfs: true, crypto: false, p2p: false, bonds: false, savings: false },
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
