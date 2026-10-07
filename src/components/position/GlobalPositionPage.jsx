import PositionEvolutionChart from '../charts/PositionEvolutionChart.jsx'
import { useMemo, useState } from 'react'
import { Bitcoin, ChartLine, HandCoins, Landmark, TrendingUp, Wallet } from 'lucide-react'
import { formatCurrency } from '../../lib/format.js'
import { buildPositionTimeline } from '../../lib/timeline.js'
import { messages } from '../../i18n/messages.jsx'
export default function GlobalPositionPage({ language, transactions, records, currentPosition, currentCash, visibility }) {
  const t = messages[language]
  const [range, setRange] = useState('12')
  const timeline = useMemo(() => buildPositionTimeline({ transactions, ...records, visibility }), [transactions, records, visibility])
  const current = timeline.at(-1) || { position: currentPosition, cash: currentCash, assets: 0, etfs: 0, crypto: 0, p2p: 0, bonds: 0, savings: 0 }
  const assetRows = [
    { key: 'etfs', label: t.etfs, value: current.etfs, tint: 'etf-tint', icon: <ChartLine size={16} /> },
    { key: 'crypto', label: t.crypto, value: current.crypto, tint: 'crypto-tint', icon: <Bitcoin size={16} /> },
    { key: 'p2p', label: t.p2p, value: current.p2p, tint: 'p2p-tint', icon: <HandCoins size={16} /> },
    { key: 'bonds', label: t.bonds, value: current.bonds, tint: 'bonds-tint', icon: <Landmark size={16} /> },
    { key: 'savings', label: t.savings, value: current.savings, tint: 'savings-tint', icon: <Wallet size={16} /> },
  ].filter((item) => visibility[item.key])
  const grossAssets = assetRows.reduce((sum, item) => sum + item.value, 0) + Math.max(0, current.cash)
  const ranges = [['3', t.period3], ['6', t.period6], ['12', t.period12], ['24', t.period24], ['all', t.periodAll]]

  return <div className="page-content global-position-page">
    <section className="welcome-row"><div><p className="eyebrow">{t.globalPosition}</p><h1>{t.positionHeading}<span>.</span></h1><p className="welcome-sub">{t.positionSubtitle}</p></div></section>
    <section className="position-summary-grid"><article className="position-summary-card position-total-card"><span>{t.totalPosition}</span><strong>{formatCurrency(current.position, language)}</strong><small>{t.fireEstimateNote}</small></article><article className="position-summary-card"><span>{t.trackedCash}</span><strong className={current.cash < 0 ? 'negative-return' : ''}>{formatCurrency(current.cash, language)}</strong></article><article className="position-summary-card"><span>{t.totalAssets}</span><strong>{formatCurrency(current.assets, language)}</strong></article></section>
    <section className="panel position-assets-panel"><div className="panel-heading"><div><h2>{t.currentAssets}</h2><p>{t.portfolioSummarySubtitle}</p></div><span className="panel-icon"><ChartLine size={17} /></span></div><div className="position-assets-grid">{assetRows.map((item) => { const share = grossAssets > 0 ? Math.max(0, (item.value / grossAssets) * 100) : 0; return <article className="position-asset-card" key={item.key}><div className="position-asset-label"><span className={`portfolio-mini-icon ${item.tint}`}>{item.icon}</span><span>{item.label}</span></div><strong>{formatCurrency(item.value, language)}</strong><div className="position-asset-bar"><span style={{ width: `${Math.min(100, share)}%` }} /></div><small>{share.toFixed(1)}% {t.of} {t.totalAssets.toLowerCase()}</small></article> })}</div></section>
    <section className="panel position-evolution-panel"><div className="position-evolution-heading"><div className="panel-heading"><div><h2>{t.assetEvolution}</h2><p>{t.assetEvolutionSubtitle}</p></div><span className="panel-icon"><TrendingUp size={17} /></span></div><div className="range-switch" role="group" aria-label={t.assetEvolution}>{ranges.map(([value, label]) => <button key={value} className={range === value ? 'range-option active-range' : 'range-option'} aria-pressed={range === value} onClick={() => setRange(value)}>{label}</button>)}</div></div><PositionEvolutionChart timeline={timeline} language={language} range={range} visibility={visibility} /></section>
    <footer className="page-footer"><span>{t.globalPositionNote}</span><span>{t.footerMonth} <span className="footer-heart">♥</span></span></footer>
  </div>
}
