import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { messages } from '../../i18n/messages.jsx'

export default function FireGoalModal({ language, goal, onClose, onSave }) {
  const t = messages[language]
  const [amount, setAmount] = useState(String(goal))
  const [error, setError] = useState('')
  function submit(event) {
    event.preventDefault()
    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) return setError(t.goalError)
    onSave(Number(amount))
  }
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="modal fire-goal-modal" role="dialog" aria-modal="true" aria-labelledby="fire-goal-modal-title">
    <div className="modal-top"><div><p className="eyebrow">{t.fireEyebrow}</p><h2 id="fire-goal-modal-title">{t.setFireGoal}</h2></div><button className="icon-button" onClick={onClose} aria-label={t.close}><X size={19} /></button></div>
    <form onSubmit={submit}><label className="field-label" htmlFor="fire-goal-amount">{t.goalAmount}</label><div className="amount-input"><span>€</span><input id="fire-goal-amount" autoFocus type="number" min="1" step="1000" value={amount} onChange={(event) => setAmount(event.target.value)} /></div>{error && <p className="form-error">{error}</p>}<button className="submit-button" type="submit"><Check size={17} /> {t.saveChanges}</button></form>
  </section></div>
}
