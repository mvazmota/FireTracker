/**
 * The demo accounts.
 *
 * Each persona is plain data describing a person and their money; `build.js`
 * turns it into the transactions and holdings the app expects. Adding a demo
 * account is therefore a matter of describing someone rather than writing
 * another generator — which is the point, since the reason for having several
 * is to exercise features against different financial situations.
 *
 * The account rows themselves are created by a migration. The data is filled in
 * the first time the account is opened, so a persona can be changed without a
 * new migration (see DataProvider).
 */
export const DEMO_PERSONAS = [
  {
    id: 'established',
    email: 'demo@email.com',
    name: 'Demo',
    // The original showcase account: three years of history with every asset
    // type in play. Built by the hand-written simulation, which nothing else
    // reproduces.
    shape: 'established',
  },
  {
    id: 'just-started',
    email: 'tiago@email.com',
    name: 'Tiago',
    birthYear: 2004,
    country: 'PT',
    // One year in the app, so the averages have a full twelve months to work on.
    months: 12,
    platforms: ['Bank account', 'Trade Republic'],
    categories: {
      expense: ['Housing', 'Food & dining', 'Transport', 'Entertainment', 'Shopping', 'Health', 'Investment'],
      income: ['Salary', 'Other'],
    },
    // The plain 4% rule applied to whatever he actually spends.
    plan: { strategy: 'traditional', withdrawalRate: 0.04, retirementSpending: null, postFireIncome: 0, realReturn: 0.05 },

    // What he already had in the bank when he started. Dated before the tracked
    // year on purpose: it is money he had, not money he earned, so it must not
    // touch the averages behind the FIRE number.
    openingBalance: { amount: 10000, title: 'Opening balance', category: 'Other', platform: 'Bank account' },

    // His salary is recurring rather than twelve rows, so the app's own
    // generator keeps producing it once the seeded months run out.
    income: [
      { key: 'salary', title: 'Monthly salary', category: 'Salary', amount: 2000, day: 1, recurring: true },
    ],

    // Roughly €1,440 a month, which leaves about €560 to save — €200 of it
    // invested, the rest sitting in cash because he has no savings account yet.
    expenses: [
      { key: 'rent', title: 'Rent', category: 'Housing', amount: 750, day: 1 },
      { key: 'phone', title: 'Mobile phone', category: 'Housing', amount: 20, day: 2 },
      { key: 'internet', title: 'Home internet', category: 'Housing', amount: 35, day: 2, spread: 3 },
      { key: 'water', title: 'Water bill', category: 'Housing', amount: 20, day: 3, spread: 4 },
      { key: 'electricity', title: 'Electricity bill', category: 'Housing', amount: 55, day: 4, spread: 12, seasonal: true },
      { key: 'transport', title: 'Monthly transport pass', category: 'Transport', amount: 40, day: 3 },
      { key: 'groceries', title: 'Groceries', category: 'Food & dining', amount: 65, days: [5, 12, 19, 26], spread: 10 },
      { key: 'eating-out', title: 'Dinner out', category: 'Food & dining', amount: 130, day: 17, spread: 25 },
      { key: 'clothes', title: 'Clothes & essentials', category: 'Shopping', amount: 90, day: 21, spread: 30 },
      { key: 'health', title: 'Pharmacy & health', category: 'Health', amount: 30, day: 21, months: [0, 2, 4, 6, 8, 10] },
      // The gaming hobby: a few purchases across the year rather than a monthly
      // bill, which is exactly the kind of lumpy spending an average has to cope
      // with.
      { key: 'games', title: 'Game purchase', category: 'Entertainment', amount: 55, day: 14, spread: 20, months: [0, 2, 3, 5, 8, 10] },
    ],

    investments: [
      { type: 'etf', id: 'tiago-vuaa', symbol: 'VUAA', name: 'Vanguard S&P 500 UCITS ETF', platform: 'Trade Republic', monthly: 200, day: 5, price: 96, drift: 0.9, wobble: 3.2 },
    ],
  },
  {
    id: 'settled',
    email: 'diogo@email.com',
    name: 'Diogo',
    birthYear: 1998,
    country: 'PT',
    // Three years in the app, which is long enough for the seasonal swings to
    // repeat and for the averages to have seen all of them.
    months: 36,
    platforms: ['Bank account', 'Trade Republic', 'Coinbase'],
    categories: {
      expense: ['Housing', 'Food & dining', 'Transport', 'Entertainment', 'Shopping', 'Health', 'Investment'],
      income: ['Salary'],
    },
    plan: { strategy: 'traditional', withdrawalRate: 0.04, retirementSpending: null, postFireIncome: 0, realReturn: 0.05 },

    // A salary plus the two allowances a Portuguese payslip carries: holiday pay
    // in June and the Christmas allowance in December. Only the salary recurs —
    // the allowances are one-offs, and the crypto buys take half of each.
    income: [
      { key: 'salary', title: 'Monthly salary', category: 'Salary', amount: 2200, day: 1, recurring: true },
      { key: 'holiday-pay', title: 'Holiday allowance', category: 'Salary', amount: 2200, day: 15, months: [5], bonus: true },
      { key: 'christmas-pay', title: 'Christmas allowance', category: 'Salary', amount: 2200, day: 15, months: [11], bonus: true },
    ],

    // About EUR 1,550 in a normal month, which leaves EUR 650 — EUR 400 of it
    // invested, the rest in cash. The seasonal lines are the point of this
    // persona: a holiday, Christmas and an annual insurance bill drag the saving
    // rate from about 2% in August to about 44% in a bonus month.
    expenses: [
      { key: 'rent', title: 'Rent', category: 'Housing', amount: 750, day: 1 },
      { key: 'phone', title: 'Mobile phone', category: 'Housing', amount: 22, day: 2 },
      { key: 'internet', title: 'Home internet', category: 'Housing', amount: 38, day: 2, spread: 3 },
      { key: 'water', title: 'Water bill', category: 'Housing', amount: 22, day: 3, spread: 5 },
      { key: 'electricity', title: 'Electricity bill', category: 'Housing', amount: 58, day: 4, spread: 14, seasonal: true },
      { key: 'transport', title: 'Transport', category: 'Transport', amount: 70, day: 3, spread: 10 },
      { key: 'groceries', title: 'Groceries', category: 'Food & dining', amount: 75, days: [4, 11, 18, 25], spread: 12 },
      { key: 'eating-out', title: 'Eating out & social', category: 'Food & dining', amount: 150, day: 17, spread: 35 },
      { key: 'shopping', title: 'Clothes & shopping', category: 'Shopping', amount: 80, day: 21, spread: 35 },
      { key: 'subscriptions', title: 'Subscriptions', category: 'Entertainment', amount: 35, day: 6 },
      { key: 'gym', title: 'Gym', category: 'Health', amount: 25, day: 8 },
      { key: 'insurance', title: 'Car & home insurance', category: 'Housing', amount: 320, day: 10, months: [2] },
      { key: 'holiday', title: 'Summer holiday', category: 'Entertainment', amount: 600, day: 12, months: [7] },
      { key: 'christmas', title: 'Christmas & gifts', category: 'Entertainment', amount: 500, day: 18, months: [11] },
    ],

    investments: [
      { type: 'etf', id: 'diogo-vuaa', symbol: 'VUAA', name: 'Vanguard S&P 500 UCITS ETF', platform: 'Trade Republic', monthly: 400, day: 5, price: 92, drift: 0.85, wobble: 3.4 },
      // Half of every allowance, priced on the volatile curve rather than a
      // straight line, because that is what holding bitcoin actually looks like.
      { type: 'crypto', id: 'diogo-btc', symbol: 'BTC', name: 'Bitcoin', platform: 'Coinbase', curve: 'crypto', onBonus: 0.5, day: 16 },
    ],
  },
]

/** The persona behind an email address, or null when it is a real account. */export function demoPersonaFor(email) {
  if (!email) return null
  const wanted = email.trim().toLowerCase()
  return DEMO_PERSONAS.find((persona) => persona.email === wanted) || null
}
