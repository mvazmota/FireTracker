import PlatformSelector from '../ui/PlatformSelector.jsx'
import { useState } from 'react'
import { Check, Plus, X } from 'lucide-react'
import { messages } from '../../i18n/messages.jsx'
export default function FixedIncomeModal({ language, kind, record, onClose, onSave, platforms }) {
  const t = messages[language]
  const isBond = kind === 'bonds'
  const [platform, setPlatform] = useState(record?.platform || '')
  const [name, setName] = useState(record?.name || '')
  const [issuer, setIssuer] = useState(record?.issuer || '')
  const [invested, setInvested] = useState(String(record?.invested ?? record?.investedValue ?? ''))
  const [currentValue, setCurrentValue] = useState(String(record?.currentValue ?? ''))
  const [annualRate, setAnnualRate] = useState(String(record?.annualRate ?? record?.couponRate ?? ''))
  const [nominalValue, setNominalValue] = useState(String(record?.nominalValue ?? ''))
  const [purchaseValue, setPurchaseValue] = useState(String(record?.investedValue ?? ''))
  const [maturityDate, setMaturityDate] = useState(record?.maturityDate || '')
  const [error, setError] = useState('')
  const numberIsValid = (value, allowZero = false) => value.trim() !== '' && Number.isFinite(Number(value)) && (allowZero ? Number(value) >= 0 : Number(value) > 0)

  function submit(event) {
    event.preventDefault()
    if (isBond ? !name.trim() : !platform.trim() || !name.trim()) return setError(isBond ? t.nameRequired : t.providerRequired)
    if (isBond && !issuer.trim()) return setError(t.providerRequired)
    if (isBond && !platform.trim()) return setError(t.platformRequired)
    const amountsValid = isBond
      ? numberIsValid(nominalValue) && numberIsValid(purchaseValue) && numberIsValid(currentValue, true)
      : numberIsValid(invested) && numberIsValid(currentValue, true)
    if (!amountsValid) return setError(t.investmentAmountsError)
    if (annualRate && !numberIsValid(annualRate, true)) return setError(t.rateError)
    if (isBond && !maturityDate) return setError(t.maturityRequired)
    onSave(isBond
      ? { ...record, id: record?.id || crypto.randomUUID(), name: name.trim(), issuer: issuer.trim(), platform: platform.trim(), nominalValue: Number(nominalValue), investedValue: Number(purchaseValue), currentValue: Number(currentValue), couponRate: Number(annualRate || 0), maturityDate }
      : { ...record, id: record?.id || crypto.randomUUID(), platform: platform.trim(), name: name.trim(), invested: Number(invested), currentValue: Number(currentValue), annualRate: Number(annualRate || 0) })
  }

  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="modal investment-modal" role="dialog" aria-modal="true" aria-labelledby="fixed-income-modal-title">
    <div className="modal-top"><div><p className="eyebrow">{record ? t.editRecord.toUpperCase() : (isBond ? t.addBond : t.addP2P).toUpperCase()}</p><h2 id="fixed-income-modal-title">{record ? (isBond ? t.bondsHeading : t.p2pHeading) : (isBond ? t.addBond : t.addP2P)}</h2></div><button className="icon-button" onClick={onClose} aria-label={t.close}><X size={19} /></button></div>
    <form onSubmit={submit}>
      {isBond ? <>
        <label className="field-label" htmlFor="fixed-name">{t.bondName}</label><input className="investment-field" id="fixed-name" autoFocus placeholder={language === 'pt' ? 'ex.: Obrigação do Tesouro' : 'e.g. Treasury bond 2030'} value={name} onChange={(event) => setName(event.target.value)} />
        <PlatformSelector id="fixed-platform" label={t.platform} value={platform} onChange={setPlatform} platforms={platforms} language={language} />
        <div className="form-row"><div><label className="field-label" htmlFor="fixed-issuer">{t.issuer}</label><input className="investment-field" id="fixed-issuer" placeholder={language === 'pt' ? 'ex.: República Portuguesa' : 'e.g. Government of Portugal'} value={issuer} onChange={(event) => setIssuer(event.target.value)} /></div><div><label className="field-label" htmlFor="fixed-maturity">{t.maturityDate}</label><input className="investment-field" id="fixed-maturity" type="date" value={maturityDate} onChange={(event) => setMaturityDate(event.target.value)} /></div></div>
        <div className="form-row"><div><label className="field-label" htmlFor="fixed-nominal">{t.nominalValue}</label><div className="amount-input"><span>€</span><input id="fixed-nominal" type="number" min="0.01" step="0.01" placeholder={t.pricePlaceholder} value={nominalValue} onChange={(event) => setNominalValue(event.target.value)} /></div></div><div><label className="field-label" htmlFor="fixed-purchase">{t.purchaseValue}</label><div className="amount-input"><span>€</span><input id="fixed-purchase" type="number" min="0.01" step="0.01" placeholder={t.pricePlaceholder} value={purchaseValue} onChange={(event) => setPurchaseValue(event.target.value)} /></div></div></div>
        <div className="form-row"><div><label className="field-label" htmlFor="fixed-current">{t.bondCurrentValue}</label><div className="amount-input"><span>€</span><input id="fixed-current" type="number" min="0" step="0.01" placeholder={t.pricePlaceholder} value={currentValue} onChange={(event) => setCurrentValue(event.target.value)} /></div></div><div><label className="field-label" htmlFor="fixed-rate">{t.couponRate}</label><div className="amount-input"><input id="fixed-rate" type="number" min="0" step="0.01" placeholder="0.00" value={annualRate} onChange={(event) => setAnnualRate(event.target.value)} /><span>%</span></div></div></div>
      </> : <>
        <div className="form-row"><div><PlatformSelector id="fixed-platform" label={t.platform} value={platform} onChange={setPlatform} platforms={platforms} language={language} /></div><div><label className="field-label" htmlFor="fixed-name">{t.projectName}</label><input className="investment-field" id="fixed-name" autoFocus placeholder={language === 'pt' ? 'ex.: Carteira diversificada' : 'e.g. Diversified loan portfolio'} value={name} onChange={(event) => setName(event.target.value)} /></div></div>
        <div className="form-row"><div><label className="field-label" htmlFor="fixed-invested">{t.amountInvested}</label><div className="amount-input"><span>€</span><input id="fixed-invested" type="number" min="0.01" step="0.01" placeholder={t.pricePlaceholder} value={invested} onChange={(event) => setInvested(event.target.value)} /></div></div><div><label className="field-label" htmlFor="fixed-current">{t.accountValue}</label><div className="amount-input"><span>€</span><input id="fixed-current" type="number" min="0" step="0.01" placeholder={t.pricePlaceholder} value={currentValue} onChange={(event) => setCurrentValue(event.target.value)} /></div></div></div>
        <label className="field-label" htmlFor="fixed-rate">{t.expectedReturn}</label><div className="amount-input"><input id="fixed-rate" type="number" min="0" step="0.01" placeholder="0.00" value={annualRate} onChange={(event) => setAnnualRate(event.target.value)} /><span>%</span></div>
      </>}
      {error && <p className="form-error">{error}</p>}<button className="submit-button" type="submit">{record ? <Check size={17} /> : <Plus size={17} />} {record ? t.saveRecord : t.addRecord}</button>
    </form>
  </section></div>
}
