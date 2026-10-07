import PlatformSelector from '../ui/PlatformSelector.jsx'
import { useState } from 'react'
import { Check, Plus, X } from 'lucide-react'
import { useI18n } from '../../i18n/LanguageProvider.jsx'
import { useSettings } from '../../context/SettingsProvider.jsx'
export default function SavingsAccountModal({ account, onClose, onSave }) {
  const { platforms } = useSettings()
  const { t, locale, language } = useI18n()
  const [name, setName] = useState(account?.name || '')
  const [institution, setInstitution] = useState(account?.institution || '')
  const [balance, setBalance] = useState(String(account?.balance ?? ''))
  const [rate, setRate] = useState(String(account?.annualRate ?? ''))
  const [error, setError] = useState('')

  function submit(event) {
    event.preventDefault()
    if (!name.trim() || !institution.trim()) return setError(t.nameRequired)
    if (balance.trim() === '' || !Number.isFinite(Number(balance)) || Number(balance) < 0) return setError(t.historyValueError)
    if (rate && (!Number.isFinite(Number(rate)) || Number(rate) < 0)) return setError(t.rateError)
    onSave({ ...account, id: account?.id || crypto.randomUUID(), name: name.trim(), institution: institution.trim(), platform: institution.trim(), balance: Number(balance), annualRate: Number(rate || 0) })
  }

  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="modal investment-modal" role="dialog" aria-modal="true" aria-labelledby="savings-modal-title">
    <div className="modal-top"><div><p className="eyebrow">{account ? t.editSavingsAccount.toUpperCase() : t.addSavingsAccount.toUpperCase()}</p><h2 id="savings-modal-title">{account ? t.editSavingsAccount : t.addSavingsAccount}</h2></div><button className="icon-button" onClick={onClose} aria-label={t.close}><X size={19} /></button></div>
    <form onSubmit={submit}>
      <label className="field-label" htmlFor="savings-name">{t.savingsAccountName}</label><input className="investment-field" id="savings-name" autoFocus placeholder={language === 'pt' ? 'ex.: Fundo de emergência' : 'e.g. Emergency fund'} value={name} onChange={(event) => setName(event.target.value)} />
      <div className="form-row"><div><PlatformSelector id="savings-institution" label={t.institution} value={institution} onChange={setInstitution} /></div><div><label className="field-label" htmlFor="savings-rate">{t.savingsRate}</label><div className="amount-input"><input id="savings-rate" type="number" min="0" step="0.01" placeholder="0.00" value={rate} onChange={(event) => setRate(event.target.value)} /><span>%</span></div></div></div>
      <label className="field-label" htmlFor="savings-balance">{t.openingBalance}</label><div className="amount-input"><span>€</span><input id="savings-balance" type="number" min="0" step="0.01" placeholder="0.00" value={balance} disabled={Boolean(account)} onChange={(event) => setBalance(event.target.value)} /></div>
      {account && <p className="history-intro">{t.savingsAccountNote}</p>}
      {error && <p className="form-error">{error}</p>}<button className="submit-button" type="submit">{account ? <Check size={17} /> : <Plus size={17} />} {account ? t.saveRecord : t.addSavingsAccount}</button>
    </form>
  </section></div>
}
