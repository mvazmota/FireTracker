// Date helpers. Transactions store a full local ISO timestamp (YYYY-MM-DDTHH:mm:ss).

export function localeFor(language) {
  return language === 'pt' ? 'pt-PT' : 'en-IE'
}

export function dateForMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function dateKey(date) {
  return `${monthKey(date)}-${String(date.getDate()).padStart(2, '0')}`
}

export function timeStamp(date) {
  const time = [date.getHours(), date.getMinutes(), date.getSeconds()].map((part) => String(part).padStart(2, '0')).join(':')
  return `${dateKey(date)}T${time}`
}

/** Accepts a date-only string and upgrades it to a full timestamp. */
export function normalizeTransactionDate(value) {
  if (typeof value !== 'string') return value
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value}T12:00:00`
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return `${value}:00`
  return value
}

export function parseTransactionDate(value) {
  return new Date(normalizeTransactionDate(value))
}

/** Table display: date plus hours and minutes. */
export function formatDateTime(value, language, withYear = false) {
  const parsed = parseTransactionDate(value)
  if (Number.isNaN(parsed.getTime())) return value
  const options = { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }
  if (withYear) options.year = 'numeric'
  return new Intl.DateTimeFormat(localeFor(language), options).format(parsed)
}

export function formatMonthLabel(month, language) {
  return new Intl.DateTimeFormat(localeFor(language), { month: 'short', year: '2-digit' }).format(new Date(`${month}-01T12:00:00`))
}
