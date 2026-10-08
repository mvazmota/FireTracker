import InvestmentAllocation from './InvestmentAllocation.jsx'
import InvestmentHistoryModal from './InvestmentHistoryModal.jsx'
import InvestmentModal from './InvestmentModal.jsx'
import EtfLookupModal from './EtfLookupModal.jsx'
import FundFacts from './FundFacts.jsx'
import { Fragment, useState } from 'react'
import { Bitcoin, ChartLine, Pencil, Plus, Search, TrendingUp, Wallet, X } from 'lucide-react'
import { formatCurrency, formatPercent } from '../../lib/format.js'
import { api } from '../../lib/api.js'
import { useI18n } from '../../i18n/LanguageProvider.jsx'
import { useSettings } from '../../context/SettingsProvider.jsx'
export default function InvestmentsPage({ holdings, onSave, onDelete, assetType = 'etf' }) {
  const { platforms } = useSettings()
  const { t, locale, language } = useI18n()
  const isCrypto = assetType === 'crypto'
  const pageHeading = isCrypto ? t.cryptoHeading : t.etfsHeading
  const pageSubtitle = isCrypto ? t.cryptoDescription : t.portfolioSubtitle
  const addLabel = isCrypto ? t.addCrypto : t.addETF
  const listHeading = isCrypto ? t.cryptoHoldings : t.holdings
  const emptyHeading = isCrypto ? t.noCrypto : t.noHoldings
  const emptyMessage = isCrypto ? t.addFirstCrypto : t.addFirstETF
  const [editingHolding, setEditingHolding] = useState(null)
  const [historyRecord, setHistoryRecord] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [showLookup, setShowLookup] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [facts, setFacts] = useState({})
  const totalInvested = holdings.reduce((sum, holding) => sum + holding.units * holding.averageCost, 0)
  const marketValue = holdings.reduce((sum, holding) => sum + holding.units * holding.currentPrice, 0)
  const unrealised = marketValue - totalInvested
  const returnRate = totalInvested ? (unrealised / totalInvested) * 100 : 0
  const numberFormat = new Intl.NumberFormat(language === 'pt' ? 'pt-PT' : 'en-IE', { maximumFractionDigits: 4 })

  function closeModal() {
    setShowModal(false)
    setEditingHolding(null)
  }

  function saveHolding(holding) {
    onSave(holding)
    closeModal()
  }

  function saveHistory(record) {
    onSave(record, false)
    setHistoryRecord(null)
  }

  /**
   * Opens a holding's fund details, fetching them the first time. They come from
   * the same cached lookup the ISIN form uses, so expanding a row costs a D1
   * read rather than a call to the feed.
   */
  async function toggleRow(holding) {
    const next = expandedId === holding.id ? null : holding.id
    setExpandedId(next)
    if (!next || !holding.isin || facts[holding.isin]) return
    try {
      const found = await api.lookupEtf(holding.isin)
      setFacts((current) => ({ ...current, [holding.isin]: found }))
    } catch {
      setFacts((current) => ({ ...current, [holding.isin]: { unavailable: true } }))
    }
  }

  return (
    <div className="page-content investments-page">
      <section className="welcome-row"><div><p className="eyebrow">{t.portfolioEyebrow}</p><h1>{pageHeading}<span>.</span></h1><p className="welcome-sub">{pageSubtitle}</p></div><div className="welcome-actions">{isCrypto
        ? <button className="primary-button" onClick={() => setShowModal(true)}><Plus size={18} strokeWidth={2.4} /> {addLabel}</button>
        : <button className="primary-button" onClick={() => setShowLookup(true)}><Search size={17} /> {t.addEtfByIsin}</button>}</div></section>
      <section className="summary-grid investment-summary" aria-label={t.investments}>
        <article className="summary-card balance-card"><div className="summary-label">{t.marketValue}<span className="summary-symbol"><ChartLine size={16} /></span></div><div className="summary-amount">{formatCurrency(marketValue, language)}</div><div className="summary-foot">{t.currentPortfolio}</div><div className="balance-art"><span /><span /><span /></div></article>
        <article className="summary-card"><div className="summary-label">{t.totalInvested}<span className="summary-symbol income-symbol"><Wallet size={16} /></span></div><div className="summary-amount">{formatCurrency(totalInvested, language)}</div><div className="summary-foot">{t.investedSoFar}</div></article>
        <article className="summary-card"><div className="summary-label">{t.unrealisedReturn}<span className="summary-symbol savings-symbol"><TrendingUp size={16} /></span></div><div className={`summary-amount ${unrealised < 0 ? 'negative-return' : 'positive-return'}`}>{unrealised >= 0 ? '+' : '−'}{formatCurrency(Math.abs(unrealised), language)}</div><div className="summary-foot"><span className={`trend-chip ${unrealised < 0 ? 'negative-chip' : ''}`}>{formatPercent(returnRate, language)}</span>{t.basedOnPrices}</div></article>
        <article className="summary-card"><div className="summary-label">{isCrypto ? t.cryptoCount : t.ETFCount}<span className="summary-symbol expense-symbol">{isCrypto ? <Bitcoin size={16} /> : <ChartLine size={16} />}</span></div><div className="summary-amount">{holdings.length}</div><div className="summary-foot">{t.assetsTracked}</div></article>
      </section>
      <section className="insights-grid investment-insights"><InvestmentAllocation holdings={holdings} emptyLabel={emptyHeading} /><article className="panel manual-pricing-panel"><span className="manual-pricing-icon">{isCrypto ? <Bitcoin size={18} /> : <ChartLine size={18} />}</span><div><strong>{language === 'pt' ? 'Acompanha ao teu ritmo' : 'Your portfolio, your pace'}</strong><p>{t.manualPrices}</p></div><span className="manual-pricing-tag">MANUAL</span></article></section>
      <section className="panel holdings-panel"><div className="transactions-heading"><div><h2>{listHeading}</h2><p>{t.holdingsSubtitle}</p></div>{isCrypto && <button className="text-button" onClick={() => setShowModal(true)}><Plus size={15} /> {addLabel}</button>}</div>
        {holdings.length ? <div className="holdings-table-wrap"><table className="holdings-table"><thead><tr><th>{t.symbol}</th><th>{t.platform}</th><th>{t.units}</th><th>{t.avgCost}</th><th>{t.currentPrice}</th><th>{t.value}</th><th>{t.return}</th><th><span className="sr-only">{t.history}</span></th></tr></thead><tbody>{holdings.map((holding) => { const invested = holding.units * holding.averageCost; const value = holding.units * holding.currentPrice; const gain = value - invested; const percentage = invested ? (gain / invested) * 100 : 0; return <Fragment key={holding.id}><tr><td><button className="holding-fund" onClick={() => toggleRow(holding)} aria-expanded={expandedId === holding.id} aria-label={t.etfFundDetails}><span className="holding-symbol">{holding.symbol}</span><span className="holding-name">{holding.name}{holding.isDemo && <i className="sample-chip">{t.sampleData}</i>}</span></button></td><td><span className="platform-pill">{holding.platform || t.noPlatform}</span></td><td>{numberFormat.format(holding.units)}</td><td>{formatCurrency(holding.averageCost, language)}</td><td>{formatCurrency(holding.currentPrice, language)}</td><td className="holding-value">{formatCurrency(value, language)}</td><td><span className={gain >= 0 ? 'holding-return positive-return' : 'holding-return negative-return'}>{gain >= 0 ? '+' : '−'}{formatCurrency(Math.abs(gain), language)}<small>{formatPercent(percentage, language)}</small></span></td><td><div className="transaction-actions"><button className="history-row" onClick={() => setHistoryRecord(holding)} aria-label={`${t.history}: ${holding.symbol}`} title={t.history}><ChartLine size={15} /></button><button className="edit-row" onClick={() => setEditingHolding(holding)} aria-label={`${t.editRecord}: ${holding.symbol}`} title={t.edit}><Pencil size={15} /></button><button className="delete-row" onClick={() => onDelete(holding.id)} aria-label={`${t.removeRecord}: ${holding.symbol}`} title={t.delete}><X size={15} /></button></div></td></tr>{expandedId === holding.id && <tr className="holding-details"><td colSpan={8}><FundFacts facts={facts[holding.isin]} isin={holding.isin} /></td></tr>}</Fragment> })}</tbody></table></div> : <div className="empty-transactions"><span className="empty-icon">{isCrypto ? <Bitcoin size={21} /> : <ChartLine size={21} />}</span><strong>{emptyHeading}</strong><p>{emptyMessage}</p><button className="text-button" onClick={() => (isCrypto ? setShowModal(true) : setShowLookup(true))}><Plus size={15} /> {isCrypto ? addLabel : t.addEtfByIsin}</button></div>}
      </section>
      <footer className="page-footer"><span>{t.manualPrices}</span><span>{t.footerMonth} <span className="footer-heart">♥</span></span></footer>
      {(showModal || editingHolding) && <InvestmentModal holding={editingHolding} onClose={closeModal} onSave={saveHolding} assetType={assetType} />}
      {showLookup && <EtfLookupModal onClose={() => setShowLookup(false)} onSave={(holding) => { onSave(holding); setShowLookup(false) }} />}
      {historyRecord && <InvestmentHistoryModal kind={assetType === 'crypto' ? 'crypto' : 'etfs'} record={historyRecord} onClose={() => setHistoryRecord(null)} onSave={saveHistory} />}
    </div>
  )
}
