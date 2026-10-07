import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useI18n } from '../i18n/LanguageProvider.jsx'
import { useSettings } from './SettingsProvider.jsx'
import { useData } from './DataProvider.jsx'
import { useSync } from './SyncProvider.jsx'
import { DEMO_PLATFORM_BY_TYPE } from '../lib/constants.js'
import { monthKey, normalizeTransactionDate, timeStamp } from '../lib/dates.js'
import { api } from '../lib/api.js'
import { assetMarketValue, investmentTypeFromTransaction, portfolioCostBasis } from '../lib/portfolio.js'
import { demoTransactionsForEmptyMonths } from '../lib/simulation.js'

const FinanceContext = createContext(null)

/** Maps an asset type to its state setter and the platform used by demo records. */
const ASSET_CONFIG = {
  etfs: { platform: DEMO_PLATFORM_BY_TYPE.etfs },
  crypto: { platform: DEMO_PLATFORM_BY_TYPE.crypto },
  p2p: { platform: DEMO_PLATFORM_BY_TYPE.p2p },
  bonds: { platform: DEMO_PLATFORM_BY_TYPE.bonds },
  savings: { platform: DEMO_PLATFORM_BY_TYPE.savings },
}

/**
 * Owns every piece of financial data and the operations that change it.
 * The API is the source of truth: mutations update local state for a responsive
 * UI and are written through in the background.
 */
export function FinanceProvider({ children }) {
  const { t } = useI18n()
  const { rememberPlatform, rememberCategory } = useSettings()
  const { data } = useData()
  const { run } = useSync()

  const [transactions, setTransactions] = useState([])
  const [holdings, setHoldings] = useState([])
  const [cryptoHoldings, setCryptoHoldings] = useState([])
  const [p2pRecords, setP2PRecords] = useState([])
  const [bondHoldings, setBondHoldings] = useState([])
  const [savingsAccounts, setSavingsAccounts] = useState([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    if (!data) {
      setHydrated(false)
      return
    }
    setTransactions((data.transactions || []).map((item) => ({ ...item, date: normalizeTransactionDate(item.date) })))
    setHoldings(data.etfs || [])
    setCryptoHoldings(data.crypto || [])
    setP2PRecords(data.p2p || [])
    setBondHoldings(data.bonds || [])
    setSavingsAccounts(data.savings || [])
    setHydrated(true)
  }, [data])

  const settersByType = useMemo(() => ({
    etfs: setHoldings,
    crypto: setCryptoHoldings,
    p2p: setP2PRecords,
    bonds: setBondHoldings,
    savings: setSavingsAccounts,
  }), [])

  // Keeps generated transactions in sync with the record they came from.
  useEffect(() => {
    if (!hydrated) return
    const recordsByType = { etfs: holdings, crypto: cryptoHoldings, p2p: p2pRecords, bonds: bondHoldings }
    const changedRecords = []
    const next = transactions.map((transaction) => {
      if (transaction.sourceType === 'savings') {
        const account = savingsAccounts.find((item) => item.id === transaction.sourceId)
        const platform = account?.institution || DEMO_PLATFORM_BY_TYPE.savings
        if (transaction.platform === platform) return transaction
        const updated = { ...transaction, platform }
        changedRecords.push(updated)
        return updated
      }
      if (transaction.sourceType !== 'portfolio') {
        if (!transaction.platform && transaction.isDemo) {
          const fallback = transaction.category === 'Investment'
            ? (transaction.title.toLowerCase().includes('bond') ? DEMO_PLATFORM_BY_TYPE.bonds : DEMO_PLATFORM_BY_TYPE.etfs)
            : DEMO_PLATFORM_BY_TYPE.savings
          const updated = { ...transaction, platform: fallback }
          changedRecords.push(updated)
          return updated
        }
        return transaction
      }
      const type = transaction.investmentType || Object.keys(recordsByType).find((key) => transaction.id.startsWith(`portfolio-flow-${key}-`))
      const record = recordsByType[type]?.find((item) => item.id === transaction.sourceId)
      if (!type || !record) return transaction
      const detail = type === 'etfs' || type === 'crypto' ? record.symbol : record.name
      const purchaseLabel = type === 'etfs' ? t.etfPurchase : type === 'crypto' ? t.cryptoPurchase : type === 'p2p' ? t.p2pPurchase : t.bondPurchase
      const saleLabel = type === 'etfs' ? t.etfSale : type === 'crypto' ? t.cryptoSale : type === 'p2p' ? t.p2pSale : t.bondSale
      const title = `${(transaction.flowDelta ?? (transaction.type === 'expense' ? 1 : -1)) > 0 ? purchaseLabel : saleLabel} · ${detail}`
      const platform = record.platform || ASSET_CONFIG[type].platform
      if (transaction.title === title && transaction.investmentType === type && transaction.platform === platform) return transaction
      const updated = { ...transaction, title, investmentType: type, platform }
      changedRecords.push(updated)
      return updated
    })
    if (changedRecords.length) {
      setTransactions(next)
      changedRecords.forEach((record) => run(() => api.putTransaction(record)))
    }
  }, [hydrated, transactions, holdings, cryptoHoldings, p2pRecords, bondHoldings, savingsAccounts, t, run])

  const saveTransaction = useCallback((transaction) => {
    rememberPlatform(transaction.platform)
    rememberCategory(transaction.type, transaction.category)
    const exists = transactions.some((item) => item.id === transaction.id)
    setTransactions(exists ? transactions.map((item) => (item.id === transaction.id ? transaction : item)) : [...transactions, transaction])
    run(() => api.putTransaction(transaction))
  }, [transactions, rememberPlatform, rememberCategory, run])

  const removeTransaction = useCallback((id) => {
    setTransactions((current) => current.filter((item) => item.id !== id))
    run(() => api.deleteTransaction(id))
  }, [run])

  const savePortfolioRecord = useCallback((type, record, captureCurrent = true) => {
    rememberPlatform(record.platform)
    let savedRecord = record
    if (captureCurrent) {
      const month = monthKey(new Date())
      const history = [
        ...(record.history || []).filter((item) => item.month !== month),
        { month, value: assetMarketValue(record, type), invested: portfolioCostBasis(record, type) },
      ].sort((a, b) => a.month.localeCompare(b.month))
      savedRecord = { ...record, history }
    }
    const recordsByType = { etfs: holdings, crypto: cryptoHoldings, p2p: p2pRecords, bonds: bondHoldings }
    const current = recordsByType[type]
    const previousRecord = current.find((item) => item.id === savedRecord.id)
    const delta = portfolioCostBasis(savedRecord, type) - (previousRecord ? portfolioCostBasis(previousRecord, type) : 0)
    settersByType[type](previousRecord ? current.map((item) => (item.id === savedRecord.id ? savedRecord : item)) : [...current, savedRecord])
    run(() => api.putAsset(type, savedRecord))

    if (Math.abs(delta) < 0.005) return
    const month = monthKey(new Date())
    const sourceId = `portfolio-flow-${type}-${savedRecord.id}-${month}`
    const priorFlow = transactions.find((item) => item.id === sourceId)?.flowDelta || 0
    const flowDelta = priorFlow + delta
    if (Math.abs(flowDelta) >= 0.005) {
      const detail = type === 'etfs' || type === 'crypto' ? savedRecord.symbol : savedRecord.name
      const flowLabel = type === 'etfs'
        ? (flowDelta > 0 ? t.etfPurchase : t.etfSale)
        : type === 'crypto'
          ? (flowDelta > 0 ? t.cryptoPurchase : t.cryptoSale)
          : type === 'p2p'
            ? (flowDelta > 0 ? t.p2pPurchase : t.p2pSale)
            : (flowDelta > 0 ? t.bondPurchase : t.bondSale)
      const flow = {
        id: sourceId,
        title: `${flowLabel} · ${detail}`,
        category: 'Investment',
        type: flowDelta > 0 ? 'expense' : 'income',
        amount: Math.abs(flowDelta),
        date: timeStamp(new Date()),
        platform: savedRecord.platform || '',
        sourceType: 'portfolio',
        sourceId: savedRecord.id,
        investmentType: type,
        flowDelta,
      }
      setTransactions([...transactions.filter((item) => item.id !== sourceId), flow])
      run(() => api.putTransaction(flow))
    } else if (priorFlow) {
      setTransactions(transactions.filter((item) => item.id !== sourceId))
      run(() => api.deleteTransaction(sourceId))
    }
  }, [holdings, cryptoHoldings, p2pRecords, bondHoldings, transactions, settersByType, rememberPlatform, t, run])

  const removePortfolioRecord = useCallback((type, id) => {
    const current = { etfs: holdings, crypto: cryptoHoldings, p2p: p2pRecords, bonds: bondHoldings }[type]
    settersByType[type](current.filter((item) => item.id !== id))
    run(() => api.deleteAsset(type, id))
  }, [holdings, cryptoHoldings, p2pRecords, bondHoldings, settersByType, run])

  const saveSavingsAccounts = useCallback((next) => {
    const removed = savingsAccounts.filter((account) => !next.some((item) => item.id === account.id))
    setSavingsAccounts(next)
    removed.forEach((account) => run(() => api.deleteAsset('savings', account.id)))
  }, [savingsAccounts, run])

  const saveSavingsAccount = useCallback((account) => {
    rememberPlatform(account.institution)
    const previous = savingsAccounts.find((item) => item.id === account.id)
    const delta = account.balance - (previous?.balance || 0)
    const month = monthKey(new Date())
    const history = [
      ...(account.history || []).filter((item) => item.month !== month),
      { month, value: account.balance },
    ].sort((a, b) => a.month.localeCompare(b.month))
    const savedAccount = { ...account, history }
    setSavingsAccounts(previous ? savingsAccounts.map((item) => (item.id === account.id ? savedAccount : item)) : [...savingsAccounts, savedAccount])
    run(() => api.putAsset('savings', savedAccount))

    if (Math.abs(delta) < 0.005) return
    const sourceId = `savings-flow-${account.id}-${month}`
    const priorFlow = transactions.find((item) => item.id === sourceId)?.flowDelta || 0
    const flowDelta = priorFlow + delta
    if (Math.abs(flowDelta) >= 0.005) {
      const flow = {
        id: sourceId,
        title: `${flowDelta > 0 ? t.savingsDepositTitle : t.savingsWithdrawalTitle} · ${account.name}`,
        category: 'Savings',
        type: flowDelta > 0 ? 'expense' : 'income',
        amount: Math.abs(flowDelta),
        date: timeStamp(new Date()),
        platform: account.institution || '',
        sourceType: 'savings',
        sourceId: account.id,
        flowDelta,
      }
      setTransactions([...transactions.filter((item) => item.id !== sourceId), flow])
      run(() => api.putTransaction(flow))
    } else if (priorFlow) {
      setTransactions(transactions.filter((item) => item.id !== sourceId))
      run(() => api.deleteTransaction(sourceId))
    }
  }, [savingsAccounts, transactions, rememberPlatform, t, run])

  const fillSampleHistory = useCallback(() => {
    const samples = demoTransactionsForEmptyMonths(transactions)
    if (!samples.length) return
    setTransactions([...transactions, ...samples])
    samples.forEach((item) => run(() => api.putTransaction(item)))
  }, [transactions, run])

  const value = useMemo(() => ({
    transactions,
    holdings,
    cryptoHoldings,
    p2pRecords,
    bondHoldings,
    savingsAccounts,
    hydrated,
    saveTransaction,
    removeTransaction,
    savePortfolioRecord,
    removePortfolioRecord,
    saveSavingsAccount,
    saveSavingsAccounts,
    fillSampleHistory,
    investmentTypeFromTransaction,
  }), [
    transactions, holdings, cryptoHoldings, p2pRecords, bondHoldings, savingsAccounts, hydrated,
    saveTransaction, removeTransaction, savePortfolioRecord, removePortfolioRecord,
    saveSavingsAccount, saveSavingsAccounts, fillSampleHistory,
  ])

  return <FinanceContext value={value}>{children}</FinanceContext>
}

export function useFinance() {
  const context = useContext(FinanceContext)
  if (!context) throw new Error('useFinance must be used inside <FinanceProvider>')
  return context
}
