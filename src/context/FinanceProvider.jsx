import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useI18n } from '../i18n/LanguageProvider.jsx'
import { useSettings } from './SettingsProvider.jsx'
import {
  BONDS_STORAGE_KEY,
  CRYPTO_STORAGE_KEY,
  INVESTMENT_STORAGE_KEY,
  P2P_STORAGE_KEY,
  SAVINGS_STORAGE_KEY,
  STORAGE_KEY,
  DEMO_PLATFORM_BY_TYPE,
} from '../lib/constants.js'
import { monthKey, timeStamp } from '../lib/dates.js'
import { assetMarketValue, investmentTypeFromTransaction, portfolioCostBasis } from '../lib/portfolio.js'
import { demoTransactionsForEmptyMonths } from '../lib/simulation.js'
import {
  loadBonds,
  loadCrypto,
  loadInvestments,
  loadP2P,
  loadSavingsAccounts,
  loadTransactions,
  writeJSON,
} from '../lib/storage.js'

const FinanceContext = createContext(null)

/** Maps an asset type to its state setter and storage key. */
const ASSET_CONFIG = {
  etfs: { key: INVESTMENT_STORAGE_KEY, platform: DEMO_PLATFORM_BY_TYPE.etfs },
  crypto: { key: CRYPTO_STORAGE_KEY, platform: DEMO_PLATFORM_BY_TYPE.crypto },
  p2p: { key: P2P_STORAGE_KEY, platform: DEMO_PLATFORM_BY_TYPE.p2p },
  bonds: { key: BONDS_STORAGE_KEY, platform: DEMO_PLATFORM_BY_TYPE.bonds },
  savings: { key: SAVINGS_STORAGE_KEY, platform: DEMO_PLATFORM_BY_TYPE.savings },
}

/**
 * Owns every piece of financial data and the operations that change it.
 * Buying an investment or depositing into savings also writes a matching
 * transaction, which is why this lives in one provider.
 */
export function FinanceProvider({ children }) {
  const { t } = useI18n()
  const { rememberPlatform, rememberCategory } = useSettings()

  const [transactions, setTransactions] = useState(loadTransactions)
  const [holdings, setHoldings] = useState(loadInvestments)
  const [cryptoHoldings, setCryptoHoldings] = useState(loadCrypto)
  const [p2pRecords, setP2PRecords] = useState(loadP2P)
  const [bondHoldings, setBondHoldings] = useState(loadBonds)
  const [savingsAccounts, setSavingsAccounts] = useState(loadSavingsAccounts)

  const save = useCallback((next) => {
    setTransactions(next)
    writeJSON(STORAGE_KEY, next)
  }, [])

  const settersByType = useMemo(() => ({
    etfs: setHoldings,
    crypto: setCryptoHoldings,
    p2p: setP2PRecords,
    bonds: setBondHoldings,
    savings: setSavingsAccounts,
  }), [])

  // Keeps generated transactions in sync with the record they came from.
  useEffect(() => {
    const recordsByType = { etfs: holdings, crypto: cryptoHoldings, p2p: p2pRecords, bonds: bondHoldings }
    let changed = false
    const next = transactions.map((transaction) => {
      if (transaction.sourceType === 'savings') {
        const account = savingsAccounts.find((item) => item.id === transaction.sourceId)
        const platform = account?.institution || DEMO_PLATFORM_BY_TYPE.savings
        if (transaction.platform === platform) return transaction
        changed = true
        return { ...transaction, platform }
      }
      if (transaction.sourceType !== 'portfolio') {
        if (!transaction.platform && transaction.isDemo) {
          const fallback = transaction.category === 'Investment'
            ? (transaction.title.toLowerCase().includes('bond') ? DEMO_PLATFORM_BY_TYPE.bonds : DEMO_PLATFORM_BY_TYPE.etfs)
            : DEMO_PLATFORM_BY_TYPE.savings
          changed = true
          return { ...transaction, platform: fallback }
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
      changed = true
      return { ...transaction, title, investmentType: type, platform }
    })
    if (changed) save(next)
  }, [transactions, holdings, cryptoHoldings, p2pRecords, bondHoldings, savingsAccounts, t, save])

  const saveTransaction = useCallback((transaction) => {
    rememberPlatform(transaction.platform)
    rememberCategory(transaction.type, transaction.category)
    const exists = transactions.some((item) => item.id === transaction.id)
    save(exists ? transactions.map((item) => (item.id === transaction.id ? transaction : item)) : [...transactions, transaction])
  }, [transactions, save, rememberPlatform, rememberCategory])

  const removeTransaction = useCallback((id) => {
    save(transactions.filter((item) => item.id !== id))
  }, [transactions, save])

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
    const config = ASSET_CONFIG[type]
    const recordsByType = { etfs: holdings, crypto: cryptoHoldings, p2p: p2pRecords, bonds: bondHoldings }
    const current = recordsByType[type]
    const previousRecord = current.find((item) => item.id === savedRecord.id)
    const delta = portfolioCostBasis(savedRecord, type) - (previousRecord ? portfolioCostBasis(previousRecord, type) : 0)
    const next = previousRecord
      ? current.map((item) => (item.id === savedRecord.id ? savedRecord : item))
      : [...current, savedRecord]
    settersByType[type](next)
    writeJSON(config.key, next)

    if (Math.abs(delta) >= 0.005) {
      const month = monthKey(new Date())
      const sourceId = `portfolio-flow-${type}-${savedRecord.id}-${month}`
      const priorFlow = transactions.find((item) => item.id === sourceId)?.flowDelta || 0
      const flowDelta = priorFlow + delta
      const nextTransactions = transactions.filter((item) => item.id !== sourceId)
      if (Math.abs(flowDelta) >= 0.005) {
        const detail = type === 'etfs' || type === 'crypto' ? savedRecord.symbol : savedRecord.name
        const flowLabel = type === 'etfs'
          ? (flowDelta > 0 ? t.etfPurchase : t.etfSale)
          : type === 'crypto'
            ? (flowDelta > 0 ? t.cryptoPurchase : t.cryptoSale)
            : type === 'p2p'
              ? (flowDelta > 0 ? t.p2pPurchase : t.p2pSale)
              : (flowDelta > 0 ? t.bondPurchase : t.bondSale)
        nextTransactions.push({
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
        })
      }
      save(nextTransactions)
    }
  }, [holdings, cryptoHoldings, p2pRecords, bondHoldings, transactions, save, settersByType, rememberPlatform, t])

  const removePortfolioRecord = useCallback((type, id) => {
    const current = { etfs: holdings, crypto: cryptoHoldings, p2p: p2pRecords, bonds: bondHoldings }[type]
    const next = current.filter((item) => item.id !== id)
    settersByType[type](next)
    writeJSON(ASSET_CONFIG[type].key, next)
  }, [holdings, cryptoHoldings, p2pRecords, bondHoldings, settersByType])

  const saveSavingsAccounts = useCallback((next) => {
    setSavingsAccounts(next)
    writeJSON(SAVINGS_STORAGE_KEY, next)
  }, [])

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
    const nextAccounts = previous
      ? savingsAccounts.map((item) => (item.id === account.id ? savedAccount : item))
      : [...savingsAccounts, savedAccount]
    saveSavingsAccounts(nextAccounts)

    if (Math.abs(delta) >= 0.005) {
      const sourceId = `savings-flow-${account.id}-${month}`
      const priorFlow = transactions.find((item) => item.id === sourceId)?.flowDelta || 0
      const flowDelta = priorFlow + delta
      const nextTransactions = transactions.filter((item) => item.id !== sourceId)
      if (Math.abs(flowDelta) >= 0.005) {
        nextTransactions.push({
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
        })
      }
      save(nextTransactions)
    }
  }, [savingsAccounts, transactions, save, saveSavingsAccounts, rememberPlatform, t])

  const fillSampleHistory = useCallback(() => {
    const samples = demoTransactionsForEmptyMonths(transactions)
    if (samples.length) save([...transactions, ...samples])
  }, [transactions, save])

  const value = useMemo(() => ({
    transactions,
    holdings,
    cryptoHoldings,
    p2pRecords,
    bondHoldings,
    savingsAccounts,
    saveTransaction,
    removeTransaction,
    savePortfolioRecord,
    removePortfolioRecord,
    saveSavingsAccount,
    saveSavingsAccounts,
    fillSampleHistory,
    investmentTypeFromTransaction,
  }), [
    transactions, holdings, cryptoHoldings, p2pRecords, bondHoldings, savingsAccounts,
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
