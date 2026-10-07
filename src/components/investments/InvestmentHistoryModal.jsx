import InvestmentHistoryChart from '../charts/InvestmentHistoryChart.jsx'
import { useEffect, useState } from 'react'
import { Check, X } from 'lucide-react'
import { monthKey } from '../../lib/dates.js'
import { assetMarketValue, portfolioCostBasis } from '../../lib/portfolio.js'
import { useI18n } from '../../i18n/LanguageProvider.jsx'
export default function InvestmentHistoryModal({ kind, record, onClose, onSave }) {
  const { t, locale, language } = useI18n()
  const now = new Date()
  const currentMonth = monthKey(now)
  const currentValue = assetMarketValue(record, kind)
  const [month, setMonth] = useState(currentMonth)
  const [value, setValue] = useState(String(currentValue))
  const [error, setError] = useState('')
  const label = kind === 'etfs' || kind === 'crypto' ? `${record.symbol} · ${record.name}` : record.name

  useEffect(() => {
    const snapshot = record.history?.find((item) => item.month === month)
    setValue(snapshot ? String(snapshot.value) : month === currentMonth ? String(currentValue) : '')
  }, [month, currentMonth, currentValue, record.history])

  function submit(event) {
    event.preventDefault()
    if (!month || month > currentMonth) return setError(t.futureMonth)
    if (value.trim() === '' || !Number.isFinite(Number(value)) || Number(value) < 0) return setError(t.historyValueError)
    const history = [...(record.history || []).filter((item) => item.month !== month), { month, value: Number(value), invested: kind === 'savings' ? 0 : portfolioCostBasis(record, kind) }].sort((a, b) => a.month.localeCompare(b.month))
    const updated = { ...record, history }
    if (month === currentMonth) {
      if (kind === 'etfs' || kind === 'crypto') updated.currentPrice = record.units ? Number(value) / record.units : record.currentPrice
      else if (kind === 'savings') updated.balance = Number(value)
      else updated.currentValue = Number(value)
    }
    onSave(updated)
  }

  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="modal history-modal" role="dialog" aria-modal="true" aria-labelledby="history-modal-title">
    <div className="modal-top"><div><p className="eyebrow">{t.monthlyHistory.toUpperCase()}</p><h2 id="history-modal-title">{label}</h2></div><button className="icon-button" onClick={onClose} aria-label={t.close}><X size={19} /></button></div>
    <p className="history-intro">{t.historySubtitle}</p><InvestmentHistoryChart history={record.history} />
    <form className="history-form" onSubmit={submit}><div className="form-row"><div><label className="field-label" htmlFor="history-month">{t.month}</label><input className="investment-field" id="history-month" type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></div><div><label className="field-label" htmlFor="history-value">{t.portfolioValue}</label><div className="amount-input"><span>€</span><input id="history-value" type="number" min="0" step="0.01" placeholder="0.00" value={value} onChange={(event) => setValue(event.target.value)} /></div></div></div>{error && <p className="form-error">{error}</p>}<button className="submit-button" type="submit"><Check size={17} /> {t.saveSnapshot}</button></form>
    <p className="history-count">{record.history?.length || 0} {t.snapshots}</p>
  </section></div>
}
