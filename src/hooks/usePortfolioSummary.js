import { useMemo } from 'react'
import { useFinance } from '../context/FinanceProvider.jsx'
import { useSettings } from '../context/SettingsProvider.jsx'
import { INVESTMENT_CATEGORIES } from '../lib/constants.js'
import { monthKey } from '../lib/dates.js'
import { investmentTypeFromTransaction } from '../lib/portfolio.js'

const EMPTY_TOTALS = { income: 0, expense: 0 }

/** Derives every headline figure shown on the dashboard from raw data. */
export function usePortfolioSummary(selectedMonth) {
  const {
    transactions, holdings, cryptoHoldings, p2pRecords, bondHoldings, savingsAccounts,
  } = useFinance()
  const { investmentVisibility } = useSettings()

  return useMemo(() => {
    const visible = investmentVisibility
    const monthlyTransactions = transactions.filter((item) => item.date.startsWith(monthKey(selectedMonth)))
    const totals = monthlyTransactions.reduce((result, item) => {
      result[item.type] += item.amount
      return result
    }, { ...EMPTY_TOTALS })
    const net = totals.income - totals.expense

    const monthlyInvested = monthlyTransactions
      .filter((item) => item.type === 'expense' && INVESTMENT_CATEGORIES.includes(item.category))
      .reduce((sum, item) => sum + item.amount, 0)
    const monthlySavingsDeposits = monthlyTransactions
      .filter((item) => item.type === 'expense' && item.category === 'Savings')
      .reduce((sum, item) => sum + item.amount, 0)
    const cashSavedThisMonth = net + monthlySavingsDeposits
    const totalSavedThisMonth = cashSavedThisMonth + monthlyInvested

    const lifetimeIncome = transactions
      .filter((item) => item.type === 'income')
      .reduce((sum, item) => sum + item.amount, 0)
    const lifetimeExpenses = transactions
      .filter((item) => item.type === 'expense')
      .reduce((sum, item) => {
        if (!INVESTMENT_CATEGORIES.includes(item.category)) return sum + item.amount
        const type = investmentTypeFromTransaction(item)
        return type && visible[type] ? sum : sum + item.amount
      }, 0)

    const sumBy = (records, pick) => records.reduce((sum, record) => sum + pick(record), 0)
    const etfsInvested = visible.etfs ? sumBy(holdings, (h) => h.units * h.averageCost) : 0
    const etfsValue = visible.etfs ? sumBy(holdings, (h) => h.units * h.currentPrice) : 0
    const cryptoInvested = visible.crypto ? sumBy(cryptoHoldings, (h) => h.units * h.averageCost) : 0
    const cryptoValue = visible.crypto ? sumBy(cryptoHoldings, (h) => h.units * h.currentPrice) : 0
    const p2pInvested = visible.p2p ? sumBy(p2pRecords, (r) => r.invested) : 0
    const p2pValue = visible.p2p ? sumBy(p2pRecords, (r) => r.currentValue) : 0
    const bondsInvested = visible.bonds ? sumBy(bondHoldings, (r) => r.investedValue) : 0
    const bondsValue = visible.bonds ? sumBy(bondHoldings, (r) => r.currentValue) : 0
    const savingsBalance = visible.savings ? sumBy(savingsAccounts, (a) => a.balance) : 0

    const totalInvested = etfsInvested + cryptoInvested + p2pInvested + bondsInvested
    const totalPortfolioValue = etfsValue + cryptoValue + p2pValue + bondsValue + savingsBalance
    const trackedCash = lifetimeIncome - lifetimeExpenses - totalInvested
    const globalPosition = trackedCash + totalPortfolioValue
    const savingsRate = totals.income ? (totalSavedThisMonth / totals.income) * 100 : 0
    const recentTransactions = [...monthlyTransactions]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5)

    return {
      monthlyTransactions,
      recentTransactions,
      totals,
      net,
      monthlyInvested,
      monthlySavingsDeposits,
      cashSavedThisMonth,
      totalSavedThisMonth,
      lifetimeIncome,
      lifetimeExpenses,
      trackedCash,
      globalPosition,
      savingsRate,
      values: {
        etfs: { invested: etfsInvested, value: etfsValue, count: holdings.length },
        crypto: { invested: cryptoInvested, value: cryptoValue, count: cryptoHoldings.length },
        p2p: { invested: p2pInvested, value: p2pValue, count: p2pRecords.length },
        bonds: { invested: bondsInvested, value: bondsValue, count: bondHoldings.length },
        savings: { invested: savingsBalance, value: savingsBalance, count: savingsAccounts.length },
      },
      totalInvested,
      totalPortfolioValue,
    }
  }, [
    transactions, holdings, cryptoHoldings, p2pRecords, bondHoldings, savingsAccounts,
    investmentVisibility, selectedMonth,
  ])
}
