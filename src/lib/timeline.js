import { monthKey } from './dates.js'
import { isInvestmentTransaction, assetMarketValue, portfolioCostBasis, investmentTypeFromTransaction } from './portfolio.js'

/**
 * Reconstructs a month-by-month view of cash and every asset type by replaying
 * transactions and each record's stored monthly history.
 */
export function buildPositionTimeline({ transactions, etfs, crypto, p2p, bonds, savings, visibility }) {
  const currentMonth = monthKey(new Date())
  const collections = { etfs, crypto, p2p, bonds, savings }
  const investmentAssets = Object.entries(collections).flatMap(([type, records]) => records.map((record) => {
    const history = [...(record.history || [])].filter((item) => item.month).sort((a, b) => a.month.localeCompare(b.month))
    const currentSnapshot = history.findIndex((item) => item.month === currentMonth)
    const snapshot = { month: currentMonth, value: assetMarketValue(record, type), invested: type === 'savings' ? 0 : portfolioCostBasis(record, type) }
    if (currentSnapshot >= 0) history[currentSnapshot] = { ...history[currentSnapshot], ...snapshot }
    else history.push(snapshot)
    history.sort((a, b) => a.month.localeCompare(b.month))
    return { type, history, nextIndex: 0, started: false, currentValue: 0, currentInvested: 0 }
  }))

  const monthKeys = [
    ...transactions.map((item) => item.date.slice(0, 7)),
    ...investmentAssets.flatMap((asset) => asset.history.map((item) => item.month)),
    currentMonth,
  ].filter(Boolean)
  const currentSerial = Number(currentMonth.slice(0, 4)) * 12 + Number(currentMonth.slice(5, 7)) - 1
  const firstSerial = Math.min(...monthKeys.map((month) => Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7)) - 1), currentSerial)

  const transactionsByMonth = new Map()
  transactions.forEach((item) => {
    const month = item.date.slice(0, 7)
    const entry = transactionsByMonth.get(month) || { income: 0, expenses: 0 }
    if (item.type === 'income') entry.income += item.amount
    else if (!isInvestmentTransaction(item) || !visibility[investmentTypeFromTransaction(item)]) entry.expenses += item.amount
    transactionsByMonth.set(month, entry)
  })

  let incomeToDate = 0
  let expensesToDate = 0
  const timeline = []
  for (let serial = firstSerial; serial <= currentSerial; serial += 1) {
    const year = Math.floor(serial / 12)
    const monthNumber = serial % 12
    const month = `${year}-${String(monthNumber + 1).padStart(2, '0')}`
    const monthlyTransactions = transactionsByMonth.get(month) || { income: 0, expenses: 0 }
    incomeToDate += monthlyTransactions.income
    expensesToDate += monthlyTransactions.expenses

    const totals = { etfs: 0, crypto: 0, p2p: 0, bonds: 0, savings: 0, invested: 0 }
    investmentAssets.forEach((asset) => {
      while (asset.nextIndex < asset.history.length && asset.history[asset.nextIndex].month <= month) {
        const snapshot = asset.history[asset.nextIndex]
        asset.currentValue = snapshot.value
        asset.currentInvested = snapshot.invested ?? asset.currentInvested
        asset.started = true
        asset.nextIndex += 1
      }
      if (!asset.started) return
      totals[asset.type] += asset.currentValue
      if (asset.type !== 'savings') totals.invested += asset.currentInvested
    })

    const cash = incomeToDate - expensesToDate - totals.invested
    timeline.push({
      month,
      cash,
      ...totals,
      assets: totals.etfs + totals.crypto + totals.p2p + totals.bonds + totals.savings,
      position: cash + totals.etfs + totals.crypto + totals.p2p + totals.bonds + totals.savings,
    })
  }
  return timeline
}
