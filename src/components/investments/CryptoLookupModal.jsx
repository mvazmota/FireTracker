import { useEffect, useState } from 'react'
import { Search, X } from 'lucide-react'
import { api } from '../../lib/api.js'
import { buildCryptoHolding } from '../../lib/crypto.js'
import { useI18n } from '../../i18n/LanguageProvider.jsx'
import { useSettings } from '../../context/SettingsProvider.jsx'
import CryptoFacts from './CryptoFacts.jsx'
import PlatformSelector from '../ui/PlatformSelector.jsx'

const SYMBOL_PATTERN = /^[A-Z0-9]{1,10}$/

/**
 * Adds a coin from its symbol.
 *
 * The user supplies the four things nobody can look up — which coin, which
 * broker, how much and when. The coin itself is looked up as the symbol is
 * typed, so what is about to be added is on screen before anything is saved.
 */
export default function CryptoLookupModal({ onClose, onSave }) {
  const { t } = useI18n()
  const { platforms, rememberPlatform } = useSettings()
  const [symbol, setSymbol] = useState('')
  const [platform, setPlatform] = useState(platforms[0] || '')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [lookup, setLookup] = useState(null)
  const [market, setMarket] = useState(null)
  const [searching, setSearching] = useState(false)

  const symbolValue = symbol.trim().toUpperCase()

  // Looking the coin up as it is typed is what lets the user see what they are
  // adding. The price comes back with the same chart call the holding needs, so
  // the live price is on screen before the holding exists.
  useEffect(() => {
    if (!SYMBOL_PATTERN.test(symbolValue)) {
      setLookup(null)
      setMarket(null)
      setSearching(false)
      return undefined
    }
    setSearching(true)
    const handle = setTimeout(() => {
      api.lookupCoin(symbolValue)
        .then((found) => {
          setLookup(found)
          return api.coinPrices(found.symbol, date)
            .then((prices) => setMarket(prices.market))
            .catch(() => setMarket(null))
        })
        .catch(() => setLookup({ unavailable: true }))
        .finally(() => setSearching(false))
    }, 350)
    return () => clearTimeout(handle)
  }, [symbolValue, date])

  async function submit(event) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const found = await api.lookupCoin(symbolValue)
      const prices = await api.coinPrices(found.symbol, date)
      const holding = buildCryptoHolding({ lookup: found, prices: prices.rows, amount: Number(amount), date, platform })
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

  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="modal investment-modal" role="dialog" aria-modal="true" aria-labelledby="crypto-lookup-title">
    <div className="modal-top"><div><p className="eyebrow">{t.cryptoHeading.toUpperCase()}</p><h2 id="crypto-lookup-title">{t.addCryptoBySymbol}</h2><p className="history-intro">{t.cryptoLookupIntro}</p></div><button className="icon-button" onClick={onClose} aria-label={t.close}><X size={19} /></button></div>
    <form onSubmit={submit}>
      <label className="field-label" htmlFor="crypto-lookup-symbol">{t.symbol}</label>
      <div className="amount-input"><input id="crypto-lookup-symbol" autoFocus maxLength={10} placeholder="BTC" value={symbol} onChange={(event) => setSymbol(event.target.value.toUpperCase())} /></div>

      <div className="lookup-facts">
        {searching && <p className="fund-facts-empty">{t.loading}</p>}
        {lookup && <CryptoFacts symbol={lookup.symbol} name={lookup.name} market={market} />}
      </div>

      <PlatformSelector id="crypto-lookup-platform" label={t.platform} value={platform} onChange={setPlatform} />

      <div className="form-row">
        <div>
          <label className="field-label" htmlFor="crypto-lookup-amount">{t.amountEuro}</label>
          <div className="amount-input"><span>€</span><input id="crypto-lookup-amount" type="number" min="0.01" step="0.01" placeholder="0.00" value={amount} onChange={(event) => setAmount(event.target.value)} /></div>
        </div>
        <div>
          <label className="field-label" htmlFor="crypto-lookup-date">{t.purchaseDate}</label>
          <input className="investment-field" id="crypto-lookup-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}
      <button className="submit-button" type="submit" disabled={busy || !symbolValue || !(Number(amount) > 0)}>{busy ? t.loading : <><Search size={17} /> {t.addCryptoBySymbol}</>}</button>
    </form>
  </section></div>
}
