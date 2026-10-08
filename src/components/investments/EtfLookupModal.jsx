import { useState } from 'react'
import { Search, X } from 'lucide-react'
import { api } from '../../lib/api.js'
import { buildEtfHolding } from '../../lib/etf.js'
import { useI18n } from '../../i18n/LanguageProvider.jsx'
import { useSettings } from '../../context/SettingsProvider.jsx'
import PlatformSelector from '../ui/PlatformSelector.jsx'

/**
 * Adds an ETF from its ISIN.
 *
 * The user supplies the four things nobody can look up — which fund, which
 * broker, how much and when — and the app fetches the name, the price on the
 * day, the units that implies and the whole monthly history.
 */
export default function EtfLookupModal({ onClose, onSave }) {
  const { t } = useI18n()
  const { platforms, rememberPlatform } = useSettings()
  const [isin, setIsin] = useState('')
  const [platform, setPlatform] = useState(platforms[0] || '')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const lookup = await api.lookupEtf(isin.trim())
      const prices = await api.etfPrices(lookup.symbol, date)
      const holding = buildEtfHolding({ lookup, prices: prices.rows, amount: Number(amount), date, platform })
      if (!holding) {
        setError(t.etfIncomplete)
        return
      }
      if (platform) rememberPlatform(platform)
      onSave(holding)
    } catch (cause) {
      // The feed is undocumented and can fail; manual entry is always there.
      setError(cause.message === 'not_found' ? t.etfNotFound : t.etfLookupFailed)
    } finally {
      setBusy(false)
    }
  }

  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="modal investment-modal" role="dialog" aria-modal="true" aria-labelledby="etf-lookup-title">
    <div className="modal-top"><div><p className="eyebrow">{t.etfs.toUpperCase()}</p><h2 id="etf-lookup-title">{t.addEtfByIsin}</h2><p className="history-intro">{t.etfLookupIntro}</p></div><button className="icon-button" onClick={onClose} aria-label={t.close}><X size={19} /></button></div>
    <form onSubmit={submit}>
      <label className="field-label" htmlFor="etf-lookup-isin">{t.isin}</label>
      <div className="amount-input"><input id="etf-lookup-isin" autoFocus maxLength={12} placeholder="IE00BFMXXD54" value={isin} onChange={(event) => setIsin(event.target.value.toUpperCase())} /></div>

      <PlatformSelector id="etf-lookup-platform" label={t.platform} value={platform} onChange={setPlatform} />

      <div className="form-row">
        <div>
          <label className="field-label" htmlFor="etf-lookup-amount">{t.amountEuro}</label>
          <div className="amount-input"><span>€</span><input id="etf-lookup-amount" type="number" min="0.01" step="0.01" placeholder="0.00" value={amount} onChange={(event) => setAmount(event.target.value)} /></div>
        </div>
        <div>
          <label className="field-label" htmlFor="etf-lookup-date">{t.purchaseDate}</label>
          <input className="investment-field" id="etf-lookup-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}
      <button className="submit-button" type="submit" disabled={busy || !isin.trim() || !(Number(amount) > 0)}>{busy ? t.loading : <><Search size={17} /> {t.addEtfByIsin}</>}</button>
    </form>
  </section></div>
}
