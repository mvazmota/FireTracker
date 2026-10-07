import { messages } from '../../i18n/messages.jsx'

export default function PositionEvolutionChart({ timeline, language, range, visibility }) {
  const t = messages[language]
  const locale = language === 'pt' ? 'pt-PT' : 'en-IE'
  const visible = range === 'all' ? timeline : timeline.slice(-Number(range))
  const width = Math.max(760, visible.length * 56)
  const height = 260
  const plotTop = 28
  const plotBottom = 204
  const seriesKeys = ['position', 'cash', ...['etfs', 'crypto', 'p2p', 'bonds', 'savings'].filter((key) => visibility[key])]
  const allValues = visible.flatMap((point) => seriesKeys.map((key) => point[key]))
  const min = Math.min(0, ...allValues)
  const max = Math.max(1, ...allValues)
  const valueRange = max - min || 1
  const y = (value) => plotBottom - ((value - min) / valueRange) * (plotBottom - plotTop)
  const x = (index) => 34 + (index * (width - 68)) / Math.max(1, visible.length - 1)
  const series = [
    { key: 'position', label: t.globalPosition, color: '#315f48', width: 3 },
    { key: 'cash', label: t.seriesCash, color: '#91a47e', width: 2 },
    ...(visibility.etfs ? [{ key: 'etfs', label: t.seriesETFs, color: '#75ae88', width: 2 }] : []),
    ...(visibility.crypto ? [{ key: 'crypto', label: t.seriesCrypto, color: '#d4a94d', width: 2 }] : []),
    ...(visibility.p2p ? [{ key: 'p2p', label: t.seriesP2P, color: '#789bc2', width: 2 }] : []),
    ...(visibility.bonds ? [{ key: 'bonds', label: t.seriesBonds, color: '#a18bc0', width: 2 }] : []),
    ...(visibility.savings ? [{ key: 'savings', label: t.seriesSavings, color: '#df8f62', width: 2 }] : []),
  ]
  return <div className="position-chart-container"><div className="position-chart-legend">{series.map((item) => <span key={item.key}><i style={{ background: item.color }} />{item.label}</span>)}</div><div className="position-chart-scroll"><svg className="position-chart" style={{ width: `${width}px` }} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${t.positionHeading} · ${t.assetEvolution}`}>
    {[0, 1, 2, 3].map((step) => { const gridY = plotTop + step * ((plotBottom - plotTop) / 3); return <line key={step} x1="22" x2={width - 22} y1={gridY} y2={gridY} className="grid-line" /> })}
    {series.map((item) => { const points = visible.map((point, index) => `${x(index)},${y(point[item.key])}`).join(' '); return <polyline key={item.key} points={points} fill="none" stroke={item.color} strokeWidth={item.width} strokeLinecap="round" strokeLinejoin="round" className={item.key === 'position' ? 'position-total-line' : ''} /> })}
    {visible.map((point, index) => { const label = new Intl.DateTimeFormat(locale, { month: 'short', year: '2-digit' }).format(new Date(`${point.month}-01T12:00:00`)); return <text key={point.month} x={x(index)} y="239" className="chart-label" textAnchor="middle">{label}</text> })}
  </svg></div></div>
}
