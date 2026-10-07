import { Ellipsis } from 'lucide-react'
import { formatCurrency } from '../../lib/format.js'
import { categoryInfo } from '../../data/categories.js'

import { useI18n } from '../../i18n/LanguageProvider.jsx'
export default function AnnualCategoryBreakdown({ transactions, year }) {
  const { t, locale, language } = useI18n()
  const expenses = transactions.filter((item) => item.type === 'expense' && Number(item.date.slice(0, 4)) === year)
  const total = expenses.reduce((sum, item) => sum + item.amount, 0)
  const groups = expenses.reduce((result, item) => { const existing = result.find((group) => group.name === item.category); if (existing) existing.amount += item.amount; else result.push({ name: item.category, amount: item.amount, ...categoryInfo(item.category) }); return result }, []).sort((a, b) => b.amount - a.amount).slice(0, 5)
  let offset = 0
  const stops = groups.map((group) => { const start = offset; offset += total ? (group.amount / total) * 100 : 0; return `${group.color} ${start}% ${offset}%` })
  const background = total ? `conic-gradient(${stops.join(', ')})` : 'conic-gradient(#e9ede7 0% 100%)'
  return <article className="panel annual-categories-panel"><div className="panel-heading"><div><h2>{t.annualCategories}</h2><p>{t.annualCategoriesSubtitle}</p></div><span className="panel-icon"><Ellipsis size={18} /></span></div><div className="spending-breakdown annual-spending-breakdown"><div className="donut" style={{ background }}><div className="donut-hole"><span>{year}</span><strong>{formatCurrency(total, language)}</strong></div></div><div className="category-list">{groups.length ? groups.map((group) => <div className="category-row" key={group.name}><span className="category-name"><i style={{ background: group.color }} />{t.categoryNames[group.name] || group.name}</span><span>{formatCurrency(group.amount, language)}</span></div>) : <p className="empty-note">{t.noYearExpenses}</p>}</div></div></article>
}
