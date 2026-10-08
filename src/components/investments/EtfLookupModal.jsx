import { useEffect, useState } from 'react'
import { Search, X } from 'lucide-react'
import { api } from '../../lib/api.js'
import { buildEtfHolding } from '../../lib/etf.js'
import { useI18n } from '../../i18n/LanguageProvider.jsx'
import { useSettings } from '../../context/SettingsProvider.jsx'
import FundFacts from './FundFacts.jsx'
import PlatformSelector from '../ui/PlatformSelector.jsx'

const ISIN_PATTERN = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/

/**
 * Adds an ETF from its ISIN.
 *
 * The user supplies the four things nobody can look up — which fund, which
 * broker, how much and when. The fund itself is looked up as the ISIN is
 * typed, so what is about to be added is on screen before anything is saved.
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
  const [lookup, setLookup] = useState(null)
  const [searching, setSearching] = useState(false)

  const isinValue = isin.trim().toUpperCase()

  // Looking the fund up as it is typed, rather than only on submit, is what
  // lets the user see what they are adding. The catalog caches the answer, so
  // this costs a database read once per fund rather than a call to the feed.
  useEffect(() => {
    if (!ISIN_PATTERN.test(isinValue)) {
      setLookup(null)
      setSearching(false)
      return undefined
    }
    setSearching(true)
    const handle = setTimeout(() => {
      api.lookupEtf(isinValue)
        .then(setLookup)
        .catch(() => setLookup({ unavailable: true }))
        .finally(() => setSearching(false))
    }, 350)
    return () => clearTimeout(handle)
  }, [isinValue])

  async function submit(event) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const found = await api.lookupEtf(isinValue)
      const prices = await api.etfPrices(found.symbol, date)
      const holding = buildEtfHolding({ lookup: found, prices: prices.rows, amount: Number(amount), date, platform })
      if (!holding) {
        setError(t.etfIncomplete)
        return
      }
      if (platform) rememberPlatform(platform)
      onSave(holding)
    } catch (cause) {
      // The feed is undocumented and can fail; the form keeps what was typed.
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

      <div className="etf-lookup-facts">
        {searching && <p className="fund-facts-empty">{t.loading}</p>}
        {lookup && <FundFacts facts={lookup} isin={isinValue} />}
      </div>

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
      <button className="submit-button" type="submit" disabled={busy || !isinValue || !(Number(amount) > 0)}>{busy ? t.loading : <><Search size={17} /> {t.addEtfByIsin}</>}</button>
    </form>
  </section></div>
}
