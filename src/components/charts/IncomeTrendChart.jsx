import { useMemo } from 'react'

import { useI18n } from '../../i18n/LanguageProvider.jsx'
import { formatCurrency } from '../../lib/format.js'
import { monthKey } from '../../lib/dates.js'

/**
 * Income per month for the last few months, as bars.
 *
 * The window is relative to today rather than the selected month, because the
 * point is the trend: the selected month belongs to the dashboard's other
 * figures, and anchoring the trend to it would make the last bar redundant.
 */
export default function IncomeTrendChart({ transactions, months = 6 }) {
  const { t, locale, language } = useI18n()
  const data = useMemo(() => {
    const now = new Date()
    const result = []
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = monthKey(date)
      const income = transactions
        .filter((item) => item.type === 'income' && item.date.startsWith(key))
        .reduce((sum, item) => sum + item.amount, 0)
      result.push({ key, label: new Intl.DateTimeFormat(locale, { month: 'short' }).format(date), income })
    }
    return result
  }, [transactions, months, locale])
  const peak = Math.max(1, ...data.map((item) => item.income))

  return (
    <div className="chart-wrap">
      <div className="chart-legend"><span><i className="legend-dot income-dot" /> {t.income}</span></div>
      <div className="income-trend-chart">
        {data.map((item) => <div className="income-trend-col" key={item.key}>
          <span className="income-trend-value">{formatCurrency(item.income, language)}</span>
          <div className="income-trend-track"><div className="income-trend-bar" style={{ height: `${(item.income / peak) * 100}%` }} /></div>
          <span className="chart-label">{item.label}</span>
        </div>)}
      </div>
    </div>
  )
}
