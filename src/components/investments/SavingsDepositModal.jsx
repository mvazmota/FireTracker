import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { formatCurrency } from '../../lib/format.js'

import { useI18n } from '../../i18n/LanguageProvider.jsx'
export default function SavingsDepositModal({ account, onClose, onDeposit }) {
  const { t, locale, language } = useI18n()
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  function submit(event) {
    event.preventDefault()
    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) return setError(t.amountError)
    onDeposit(Number(amount))
  }
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="modal investment-modal" role="dialog" aria-modal="true" aria-labelledby="savings-deposit-title">
    <div className="modal-top"><div><p className="eyebrow">{t.savingsCategory.toUpperCase()}</p><h2 id="savings-deposit-title">{t.addMoney}</h2><p className="history-intro">{account.name} · {formatCurrency(account.balance, language)}</p></div><button className="icon-button" onClick={onClose} aria-label={t.close}><X size={19} /></button></div>
    <form onSubmit={submit}><label className="field-label" htmlFor="savings-deposit-amount">{t.depositAmount}</label><div className="amount-input"><span>€</span><input id="savings-deposit-amount" autoFocus type="number" min="0.01" step="0.01" placeholder="0.00" value={amount} onChange={(event) => setAmount(event.target.value)} /></div>{error && <p className="form-error">{error}</p>}<button className="submit-button" type="submit"><Plus size={17} /> {t.addMoney}</button></form>
  </section></div>
}
