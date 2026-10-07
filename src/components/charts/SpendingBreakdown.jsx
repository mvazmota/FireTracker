import { formatCurrency } from '../../lib/format.js'
import { categoryInfo } from '../../data/categories.js'

import { useI18n } from '../../i18n/LanguageProvider.jsx'
export default function SpendingBreakdown({ transactions }) {
  const { t, locale, language } = useI18n()
  const expenses = transactions.filter((item) => item.type === 'expense')
  const total = expenses.reduce((sum, item) => sum + item.amount, 0)
  const groups = expenses.reduce((result, item) => {
    const existing = result.find((group) => group.name === item.category)
    if (existing) existing.amount += item.amount
    else result.push({ name: item.category, amount: item.amount, ...categoryInfo(item.category) })
    return result
  }, []).sort((a, b) => b.amount - a.amount).slice(0, 4)
  let offset = 0
  const stops = groups.map((group) => {
    const start = offset
    offset += total ? (group.amount / total) * 100 : 0
    return `${group.color} ${start}% ${offset}%`
  })
  const background = total ? `conic-gradient(${stops.join(', ')})` : 'conic-gradient(#e9ede7 0% 100%)'
  return (
    <div className="spending-breakdown">
      <div className="donut" style={{ background }}><div className="donut-hole"><span>{t.thisMonth}</span><strong>{formatCurrency(total, language)}</strong></div></div>
      <div className="category-list">{groups.length ? groups.map((group) => { const Icon = group.icon; return <div className="category-row" key={group.name}><span className="category-name"><i style={{ background: group.color }} /><Icon size={15} />{t.categoryNames[group.name] || group.name}</span><span>{formatCurrency(group.amount, language)}</span></div> }) : <p className="empty-note">{t.emptySpending}</p>}</div>
    </div>
  )
}
