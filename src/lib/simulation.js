import { monthKey } from './dates.js'

let cachedSimulation = null

/** Deterministic, mildly volatile BTC price path for the demo scenario. */
export function btcPriceAt(index) {
  const trend = 28000 * (1 + index * 0.021)
  const cycle = 1 + Math.sin(index * 0.55) * 0.18 + Math.sin(index * 1.7) * 0.07
  return Math.round(Math.max(12000, trend * cycle) * 100) / 100
}

/**
 * Builds the 36-month starter scenario: a €2,000 salary, quarterly bonuses,
 * seasonal bills, everyday spending, monthly ETF/P2P contributions, quarterly
 * bond and crypto purchases, and an emergency fund.
 * Results are memoised for the session.
 */
export function threeYearSimulation() {
  if (cachedSimulation) return cachedSimulation
  const now = new Date()
  const firstMonth = new Date(now.getFullYear(), now.getMonth() - 35, 1)
  const transactions = []
  const months = []
  let ETFUnits = 0
  let ETFInvested = 0
  let ETFPrice = 100
  const ETFHistory = []
  let cryptoUnits = 0
  let cryptoInvested = 0
  const cryptoHistory = []
  let p2pValue = 0
  let p2pInvested = 0
  const p2pHistory = []
  let bondNominal = 0
  let bondInvested = 0
  let bondValue = 0
  const bondHistory = []

  function addTransaction(month, lastDay, isCurrentMonth, item) {
    if (item.day > lastDay || (isCurrentMonth && item.day > now.getDate())) return false
    const seed = (Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7))) + item.key.length * 7 + Math.round(item.amount)
    const hour = 8 + (seed % 12)
    const minute = (seed * 7) % 60
    transactions.push({
      id: `scenario-${month}-${item.key}`,
      title: item.title,
      category: item.category,
      type: item.type,
      amount: Math.round(item.amount * 100) / 100,
      date: `${month}-${String(item.day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`,
      platform: item.platform || 'Bank account',
      isDemo: true,
    })
    return true
  }

  for (let index = 0; index < 36; index += 1) {
    const date = new Date(firstMonth.getFullYear(), firstMonth.getMonth() + index, 1)
    const month = monthKey(date)
    const monthSeed = date.getFullYear() * 12 + date.getMonth()
    const isCurrentMonth = month === monthKey(now)
    const winter = [10, 11, 0, 1, 2].includes(date.getMonth())
    const bonusMonth = [2, 5, 8, 11].includes(date.getMonth())
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
    let regularSpending = 0

    addTransaction(month, lastDay, isCurrentMonth, { key: 'salary', day: 1, title: 'Monthly salary', category: 'Salary', type: 'income', amount: 2000 })
    if (bonusMonth) addTransaction(month, lastDay, isCurrentMonth, { key: 'bonus', day: 15, title: 'Quarterly bonus', category: 'Salary', type: 'income', amount: 750 })

    const rent = 750
    const phone = 28 + (monthSeed % 5) * 2
    const internet = 30 + (monthSeed % 3) * 2
    const water = 27 + (winter ? 13 : 0) + (monthSeed % 4) * 3
    const electricity = 48 + (winter ? 48 : 0) + (monthSeed % 5) * 4
    const transport = 62 + (monthSeed % 3) * 4
    const bills = [
      { key: 'rent', day: 1, title: 'Rent', category: 'Housing', amount: rent },
      { key: 'phone', day: 2, title: 'Mobile phone bill', category: 'Housing', amount: phone },
      { key: 'internet', day: 2, title: 'Home internet', category: 'Housing', amount: internet },
      { key: 'water', day: 3, title: 'Water bill', category: 'Housing', amount: water },
      { key: 'electricity', day: 4, title: 'Electricity bill', category: 'Housing', amount: electricity },
      { key: 'transport', day: 3, title: 'Monthly transport pass', category: 'Transport', amount: transport },
    ]
    bills.forEach((bill) => {
      regularSpending += bill.amount
      addTransaction(month, lastDay, isCurrentMonth, { ...bill, type: 'expense' })
    })

    const groceryAmounts = [48, 56, 44, 63].map((amount, week) => amount + ((monthSeed + week * 2) % 5) * 4)
    ;[5, 12, 19, 26].forEach((day, week) => {
      regularSpending += groceryAmounts[week]
      addTransaction(month, lastDay, isCurrentMonth, { key: `groceries-${week + 1}`, day, title: 'Groceries', category: 'Food & dining', type: 'expense', amount: groceryAmounts[week] })
    })
    const coffee = 18 + (monthSeed % 4) * 5
    const dining = 32 + (monthSeed % 5) * 7
    const leisure = 25 + (monthSeed % 6) * 8
    regularSpending += coffee + dining + leisure
    addTransaction(month, lastDay, isCurrentMonth, { key: 'coffee', day: 8, title: 'Coffee & lunch', category: 'Food & dining', type: 'expense', amount: coffee })
    addTransaction(month, lastDay, isCurrentMonth, { key: 'dining', day: 17, title: 'Dinner out', category: 'Food & dining', type: 'expense', amount: dining })
    addTransaction(month, lastDay, isCurrentMonth, { key: 'leisure', day: 22, title: 'Books, cinema & outings', category: 'Entertainment', type: 'expense', amount: leisure })
    if (index % 4 === 1) {
      const health = 18 + (monthSeed % 5) * 6
      regularSpending += health
      addTransaction(month, lastDay, isCurrentMonth, { key: 'health', day: 21, title: 'Pharmacy & health', category: 'Health', type: 'expense', amount: health })
    }
    if (date.getMonth() === 6) {
      const holiday = 780
      regularSpending += holiday
      addTransaction(month, lastDay, isCurrentMonth, { key: 'holiday', day: 18, title: 'Summer holiday', category: 'Entertainment', type: 'expense', amount: holiday })
    }
    months.push({ date, month, monthSeed, bonusMonth, regularSpending, lastDay, isCurrentMonth })

    // ETF: small monthly contribution
    ETFPrice = 98 + index * 0.72 + Math.sin(index * 0.7) * 2.4
    if (addTransaction(month, lastDay, isCurrentMonth, { key: 'etf-vwce', day: 7, title: 'ETF purchase · VWCE', category: 'Investment', type: 'expense', amount: 150, platform: 'Trade Republic' })) {
      ETFUnits += 150 / ETFPrice
      ETFInvested += 150
    }
    ETFHistory.push({ month, value: Math.round(ETFUnits * ETFPrice * 100) / 100, invested: ETFInvested })

    // P2P: monthly contribution earning about 9% a year
    p2pValue *= 1 + 0.09 / 12
    if (addTransaction(month, lastDay, isCurrentMonth, { key: 'p2p-mintos', day: 10, title: 'P2P investment · Mintos', category: 'Investment', type: 'expense', amount: 50, platform: 'Mintos' })) {
      p2pValue += 50
      p2pInvested += 50
    }
    p2pHistory.push({ month, value: Math.round(p2pValue * 100) / 100, invested: p2pInvested })

    // Bonds: bought quarterly
    if (bonusMonth) {
      if (addTransaction(month, lastDay, isCurrentMonth, { key: 'bond-portugal', day: 20, title: 'Bond purchase · Portugal Treasury 2030', category: 'Investment', type: 'expense', amount: 200, platform: 'Banco Invest' })) {
        bondNominal += 200
        bondInvested += 200
      }
    }
    bondValue = bondInvested * (1 + index * 0.00012)
    bondHistory.push({ month, value: Math.round(bondValue * 100) / 100, invested: bondInvested })

    // Crypto: a small BTC buy when the quarterly bonus lands
    const btcPrice = btcPriceAt(index)
    if (bonusMonth) {
      if (addTransaction(month, lastDay, isCurrentMonth, { key: 'crypto-btc', day: 16, title: 'Crypto purchase · BTC', category: 'Investment', type: 'expense', amount: 150, platform: 'Coinbase' })) {
        cryptoUnits += 150 / btcPrice
        cryptoInvested += 150
      }
    }
    cryptoHistory.push({ month, value: Math.round(cryptoUnits * btcPrice * 100) / 100, invested: cryptoInvested })
  }

  const monthlyTarget = months.reduce((sum, month) => sum + month.regularSpending, 0) / months.length
  const emergencyTarget = Math.round(monthlyTarget * 6 * 100) / 100
  let emergencyBalance = 0
  const savingsHistory = []
  months.forEach(({ month, bonusMonth, lastDay, isCurrentMonth }) => {
    const plannedDeposit = 150 + (bonusMonth ? 250 : 0)
    const deposit = Math.min(plannedDeposit, Math.max(0, emergencyTarget - emergencyBalance))
    if (deposit > 0 && addTransaction(month, lastDay, isCurrentMonth, { key: 'emergency-fund', day: 6, title: 'Emergency fund deposit', category: 'Savings', type: 'expense', amount: deposit, platform: 'Bank account' })) emergencyBalance += deposit
    savingsHistory.push({ month, value: Math.round(emergencyBalance * 100) / 100 })
  })

  cachedSimulation = {
    transactions: transactions.sort((a, b) => a.date.localeCompare(b.date)),
    etfs: ETFUnits > 0 ? [{ id: 'scenario-vwce', symbol: 'VWCE', name: 'Vanguard FTSE All-World UCITS ETF', platform: 'Trade Republic', units: ETFUnits, averageCost: ETFInvested / ETFUnits, currentPrice: ETFPrice, history: ETFHistory, isDemo: true }] : [],
    crypto: cryptoUnits > 0 ? [{ id: 'scenario-btc', symbol: 'BTC', name: 'Bitcoin', platform: 'Coinbase', units: cryptoUnits, averageCost: cryptoInvested / cryptoUnits, currentPrice: btcPriceAt(35), history: cryptoHistory, isDemo: true }] : [],
    p2p: p2pInvested > 0 ? [{ id: 'scenario-mintos', platform: 'Mintos', name: 'Diversified loan portfolio', invested: p2pInvested, currentValue: Math.round(p2pValue * 100) / 100, annualRate: 9, history: p2pHistory, isDemo: true }] : [],
    bonds: bondInvested > 0 ? [{ id: 'scenario-portugal-bond', name: 'Portugal Treasury Bond 2030', issuer: 'Portuguese Republic', platform: 'Banco Invest', nominalValue: bondNominal, investedValue: bondInvested, currentValue: Math.round(bondValue * 100) / 100, couponRate: 3.1, maturityDate: '2030-10-15', history: bondHistory, isDemo: true }] : [],
    savings: [{ id: 'scenario-emergency-fund', name: 'Emergency fund · 6 months', institution: 'Bank account', balance: emergencyBalance, target: emergencyTarget, annualRate: 2.25, history: savingsHistory, isDemo: true }],
  }
  return cachedSimulation
}

export function demoTransactions() { return threeYearSimulation().transactions }
export function demoInvestments() { return threeYearSimulation().etfs }
export function demoCrypto() { return threeYearSimulation().crypto }
export function demoP2P() { return threeYearSimulation().p2p }
export function demoBonds() { return threeYearSimulation().bonds }
export function demoSavings() { return threeYearSimulation().savings }

/** Demo transactions for months that have no activity yet. */
export function demoTransactionsForEmptyMonths(transactions) {
  const monthsWithActivity = new Set(transactions.map((item) => item.date.slice(0, 7)))
  return demoTransactions().filter((item) => !monthsWithActivity.has(item.date.slice(0, 7)))
}
