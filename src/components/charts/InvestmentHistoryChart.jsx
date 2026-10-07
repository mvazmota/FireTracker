import { ChartLine } from 'lucide-react'
import { messages } from '../../i18n/messages.jsx'

export default function InvestmentHistoryChart({ history, language }) {
  const t = messages[language]
  const locale = language === 'pt' ? 'pt-PT' : 'en-IE'
  const ordered = [...(history || [])].sort((a, b) => a.month.localeCompare(b.month))
  if (!ordered.length) return <div className="history-empty-chart"><span className="empty-icon"><ChartLine size={20} /></span><p>{t.noHistory}</p></div>
  const width = Math.max(520, ordered.length * 54)
  const values = ordered.map((point) => point.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || Math.max(1, max * 0.1)
  const points = ordered.map((point, index) => `${28 + (index * (width - 56)) / Math.max(1, ordered.length - 1)},${145 - ((point.value - min) / range) * 100}`).join(' ')
  return <div className="history-chart-scroll"><svg className="history-chart" style={{ width: `${width}px` }} viewBox={`0 0 ${width} 190`} role="img" aria-label={t.historyTrend}>
    {[45, 95, 145].map((y) => <line key={y} x1="20" x2={width - 20} y1={y} y2={y} className="grid-line" />)}
    <polyline points={points} className="history-line" />
    {ordered.map((point, index) => { const x = 28 + (index * (width - 56)) / Math.max(1, ordered.length - 1); const y = 145 - ((point.value - min) / range) * 100; const label = new Intl.DateTimeFormat(locale, { month: 'short', year: '2-digit' }).format(new Date(`${point.month}-01T12:00:00`)); return <g key={point.month}><circle cx={x} cy={y} r="3.5" className="history-point" /><text x={x} y="176" className="chart-label" textAnchor="middle">{label}</text></g> })}
  </svg></div>
}
