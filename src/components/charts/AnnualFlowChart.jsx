import { messages } from '../../i18n/messages.jsx'

export default function AnnualFlowChart({ transactions, year, language }) {
  const t = messages[language]
  const locale = language === 'pt' ? 'pt-PT' : 'en-IE'
  const months = Array.from({ length: 12 }, (_, index) => ({
    label: new Intl.DateTimeFormat(locale, { month: 'short' }).format(new Date(year, index, 1)),
    income: 0,
    expense: 0,
  }))
  transactions.forEach((item) => {
    if (Number(item.date.slice(0, 4)) === year) months[Number(item.date.slice(5, 7)) - 1][item.type] += item.amount
  })
  const peak = Math.max(1, ...months.flatMap((month) => [month.income, month.expense]))
  return <div className="annual-chart-wrap"><div className="chart-legend"><span><i className="legend-dot income-dot" /> {t.income}</span><span><i className="legend-dot expense-dot" /> {t.expenses}</span></div><svg className="annual-flow-chart" viewBox="0 0 720 225" role="img" aria-label={`${t.annualFlow} ${year}`}>
    {[40, 80, 120, 160].map((y) => <line key={y} x1="20" x2="700" y1={y} y2={y} className="grid-line" />)}
    {months.map((month, index) => { const x = 26 + index * 56; const incomeHeight = (month.income / peak) * 130; const expenseHeight = (month.expense / peak) * 130; return <g key={month.label}><rect x={x + 4} y={174 - incomeHeight} width="15" height={incomeHeight} rx="3" className="annual-income-bar" /><rect x={x + 22} y={174 - expenseHeight} width="15" height={expenseHeight} rx="3" className="annual-expense-bar" /><text x={x + 20} y="202" className="chart-label" textAnchor="middle">{month.label}</text></g> })}
  </svg></div>
}
