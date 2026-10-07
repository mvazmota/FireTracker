import { useMemo } from 'react'
import { messages } from '../../i18n/messages.jsx'

export default function CashFlowChart({ transactions, selectedMonth, language }) {
  const t = messages[language]
  const weeks = useMemo(() => {
    const result = Array.from({ length: 5 }, (_, index) => ({ label: `${t.week} ${index + 1}`, income: 0, expense: 0 }))
    transactions.forEach((item) => {
      const week = Math.min(4, Math.floor((Number(item.date.slice(8, 10)) - 1) / 7))
      result[week][item.type] += item.amount
    })
    return result
  }, [transactions, t.week])
  const peak = Math.max(1, ...weeks.flatMap((week) => [week.income, week.expense]))
  const points = (key) => weeks.map((week, index) => `${36 + index * 112},${152 - (week[key] / peak) * 112}`).join(' ')
  const currentMonth = selectedMonth.getFullYear() === new Date().getFullYear() && selectedMonth.getMonth() === new Date().getMonth()
  const today = currentMonth ? Math.min(4, Math.floor((new Date().getDate() - 1) / 7)) : 4
  return (
    <div className="chart-wrap">
      <div className="chart-legend"><span><i className="legend-dot income-dot" /> {t.income}</span><span><i className="legend-dot expense-dot" /> {t.expenses}</span></div>
      <svg className="flow-chart" viewBox="0 0 512 190" role="img" aria-label={t.byWeek}>
        {[40, 80, 120, 160].map((y) => <line key={y} x1="30" x2="486" y1={y} y2={y} className="grid-line" />)}
        <polyline points={points('income')} className="chart-line income-line" />
        <polyline points={points('expense')} className="chart-line expense-line" />
        {weeks.map((week, index) => <g key={week.label}><circle cx={36 + index * 112} cy={152 - (week.income / peak) * 112} r="4" className="chart-point income-point" /><circle cx={36 + index * 112} cy={152 - (week.expense / peak) * 112} r="4" className="chart-point expense-point" /><text x={36 + index * 112} y="183" className="chart-label" textAnchor="middle">{week.label}</text></g>)}
        {currentMonth && <line x1={36 + today * 112} x2={36 + today * 112} y1="26" y2="159" className="today-line" />}
      </svg>
    </div>
  )
}
