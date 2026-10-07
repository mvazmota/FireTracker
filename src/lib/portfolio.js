import { INVESTMENT_CATEGORIES } from './constants.js'

/** Cost basis of an investment record, by asset type. */
export function portfolioCostBasis(record, type) {
  if (type === 'etfs' || type === 'crypto') return record.units * record.averageCost
  if (type === 'p2p') return record.invested
  if (type === 'bonds') return record.investedValue
  return 0
}

/** Current market value of an investment record, by asset type. */
export function assetMarketValue(record, kind) {
  if (kind === 'etfs' || kind === 'crypto') return record.units * record.currentPrice
  if (kind === 'savings') return record.balance
  return record.currentValue
}

/** Maps an "Investment" transaction back to the asset type that produced it. */
export function investmentTypeFromTransaction(transaction) {
  if (transaction.investmentType) return transaction.investmentType
  const title = (transaction.title || '').toLowerCase()
  if (title.includes('etf')) return 'etfs'
  if (title.includes('crypto')) return 'crypto'
  if (title.includes('p2p')) return 'p2p'
  if (title.includes('bond')) return 'bonds'
  return null
}

export function isInvestmentTransaction(transaction) {
  return INVESTMENT_CATEGORIES.includes(transaction.category)
}

export function isSavingsTransaction(transaction) {
  return transaction.category === 'Savings'
}
