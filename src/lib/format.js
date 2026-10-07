import { localeFor } from './dates.js'

export function formatCurrency(amount, language) {
  return new Intl.NumberFormat(localeFor(language), {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(amount)
}

/** Signed percentage, e.g. +11.66% — used for returns. */
export function formatPercent(amount, language) {
  return new Intl.NumberFormat(localeFor(language), {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: 'always',
  }).format(amount / 100)
}

/** Unsigned percentage, e.g. 2.25% — used for rates. */
export function formatRate(amount, language) {
  return new Intl.NumberFormat(localeFor(language), {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount / 100)
}

export function formatNumber(value, language, options = {}) {
  return new Intl.NumberFormat(localeFor(language), options).format(value)
}
