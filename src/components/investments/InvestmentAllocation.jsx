import { ChartLine } from 'lucide-react'
import { formatCurrency } from '../../lib/format.js'
import { messages } from '../../i18n/messages.jsx'

export default function InvestmentAllocation({ holdings, language, emptyLabel }) {
  const t = messages[language]
  const palette = ['#78b7a0', '#89a9da', '#efa77c', '#ad9be0', '#df89a0', '#e7c46f']
  const totalValue = holdings.reduce((sum, holding) => sum + holding.units * holding.currentPrice, 0)
  let offset = 0
  const stops = holdings.map((holding, index) => {
    const start = offset
    offset += totalValue ? (holding.units * holding.currentPrice / totalValue) * 100 : 0
    return `${palette[index % palette.length]} ${start}% ${offset}%`
  })
  const background = totalValue ? `conic-gradient(${stops.join(', ')})` : 'conic-gradient(#e9ede7 0% 100%)'
  return (
    <article className="panel investment-allocation-panel"><div className="panel-heading"><div><h2>{t.allocation}</h2><p>{t.allocationSubtitle}</p></div><span className="panel-icon"><ChartLine size={17} /></span></div><div className="investment-allocation-content"><div className="donut" style={{ background }}><div className="donut-hole"><span>{t.marketValue.toLowerCase()}</span><strong>{formatCurrency(totalValue, language)}</strong></div></div><div className="investment-legend">{holdings.length ? holdings.map((holding, index) => <div className="investment-legend-row" key={holding.id}><span className="investment-fund-label"><i style={{ background: palette[index % palette.length] }} /><strong>{holding.symbol}</strong></span><span>{formatCurrency(holding.units * holding.currentPrice, language)}</span></div>) : <p className="empty-note">{emptyLabel}</p>}</div></div></article>
  )
}
