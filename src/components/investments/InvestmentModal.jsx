import PlatformSelector from '../ui/PlatformSelector.jsx'
import { useState } from 'react'
import { Check, Plus, X } from 'lucide-react'
import { messages } from '../../i18n/messages.jsx'
export default function InvestmentModal({ language, holding, onClose, onSave, platforms, assetType = 'etf' }) {
  const t = messages[language]
  const isCrypto = assetType === 'crypto'
  const [symbol, setSymbol] = useState(holding?.symbol || '')
  const [name, setName] = useState(holding?.name || '')
  const [platform, setPlatform] = useState(holding?.platform || '')
  const [units, setUnits] = useState(holding ? String(holding.units) : '')
  const [averageCost, setAverageCost] = useState(holding ? String(holding.averageCost) : '')
  const [currentPrice, setCurrentPrice] = useState(holding ? String(holding.currentPrice) : '')
  const [error, setError] = useState('')

  function submit(event) {
    event.preventDefault()
    if (!symbol.trim()) return setError(t.requiredTicker)
    if (!name.trim()) return setError(t.requiredName)
    if (!platform.trim()) return setError(t.platformRequired)
    if (!Number.isFinite(Number(units)) || Number(units) <= 0) return setError(t.invalidUnits)
    if (![averageCost, currentPrice].every((value) => value.trim() !== '' && Number.isFinite(Number(value)) && Number(value) >= 0)) return setError(t.invalidPrice)
    onSave({ ...holding, id: holding?.id || crypto.randomUUID(), symbol: symbol.trim().toUpperCase(), name: name.trim(), platform, units: Number(units), averageCost: Number(averageCost), currentPrice: Number(currentPrice) })
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal investment-modal" role="dialog" aria-modal="true" aria-labelledby="investment-modal-title">
        <div className="modal-top"><div><p className="eyebrow">{holding ? t.editRecord.toUpperCase() : isCrypto ? t.addCrypto.toUpperCase() : t.addETF.toUpperCase()}</p><h2 id="investment-modal-title">{holding ? isCrypto ? t.editCryptoTitle : t.editETFTitle : isCrypto ? t.addCryptoTitle : t.addETFTitle}</h2></div><button className="icon-button" onClick={onClose} aria-label={t.close}><X size={19} /></button></div>
        <form onSubmit={submit}>
          <div className="form-row"><div><label className="field-label" htmlFor="etf-symbol">{t.ticker}</label><input className="investment-field" id="etf-symbol" autoFocus placeholder={t.tickerPlaceholder} value={symbol} onChange={(event) => setSymbol(event.target.value.toUpperCase())} /></div><div><label className="field-label" htmlFor="etf-units">{t.unitsOwned}</label><input className="investment-field" id="etf-units" type="number" min="0.0001" step="any" placeholder={t.unitsPlaceholder} value={units} onChange={(event) => setUnits(event.target.value)} /></div></div>
          <label className="field-label" htmlFor="etf-name">{isCrypto ? t.cryptoName : t.fundName}</label><input className="investment-field" id="etf-name" placeholder={isCrypto ? t.cryptoPlaceholder : t.fundPlaceholder} value={name} onChange={(event) => setName(event.target.value)} />
          <PlatformSelector id="asset-platform" label={t.platform} value={platform} onChange={setPlatform} platforms={platforms} language={language} />
          <div className="form-row"><div><label className="field-label" htmlFor="etf-average-cost">{t.averageBuyPrice}</label><div className="amount-input"><span>€</span><input id="etf-average-cost" type="number" min="0" step="0.01" placeholder={t.pricePlaceholder} value={averageCost} onChange={(event) => setAverageCost(event.target.value)} /></div></div><div><label className="field-label" htmlFor="etf-current-price">{t.currentPriceEuro}</label><div className="amount-input"><span>€</span><input id="etf-current-price" type="number" min="0" step="0.01" placeholder={t.pricePlaceholder} value={currentPrice} onChange={(event) => setCurrentPrice(event.target.value)} /></div></div></div>
          {error && <p className="form-error">{error}</p>}
          <button className="submit-button" type="submit">{holding ? <Check size={17} /> : <Plus size={17} />} {holding ? t.saveETF : t.addToPortfolio}</button>
        </form>
      </section>
    </div>
  )
}
