import { useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Check, Plus, X } from 'lucide-react'
import PlatformSelector from '../ui/PlatformSelector.jsx'
import { useI18n } from '../../i18n/LanguageProvider.jsx'
import { useSettings } from '../../context/SettingsProvider.jsx'

/** Add or edit a recurring rule. */
export default function RecurringModal({ rule, onClose, onSave }) {
  const { t } = useI18n()
  const { categories } = useSettings()
  const [type, setType] = useState(rule?.type || 'expense')
  const [title, setTitle] = useState(rule?.title || '')
  const [amount, setAmount] = useState(rule ? String(rule.amount) : '')
  const [category, setCategory] = useState(rule?.category || categories.expense[0] || '')
  const [platform, setPlatform] = useState(rule?.platform || '')
  const [day, setDay] = useState(rule ? String(rule.dayOfMonth) : '1')
  const [error, setError] = useState('')

  const options = categories[type] || []

  function changeType(nextType) {
    setType(nextType)
    setCategory(categories[nextType]?.[0] || '')
  }

  function submit(event) {
    event.preventDefault()
    if (!title.trim()) return setError(t.nameError)
    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0) return setError(t.amountError)
    const dayValue = Number(day)
    if (!Number.isInteger(dayValue) || dayValue < 1 || dayValue > 31) return setError(t.dayError)
    const finalCategory = category || options[0]
    if (!finalCategory) return setError(t.categoryNameError)
    onSave({
      ...rule,
      id: rule?.id || crypto.randomUUID(),
      title: title.trim(),
      type,
      amount: value,
      category: finalCategory,
      platform: platform.trim(),
      dayOfMonth: dayValue,
    })
  }

  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="modal" role="dialog" aria-modal="true" aria-labelledby="recurring-modal-title">
      <div className="modal-top"><div><p className="eyebrow">{rule ? t.editRecurring : t.newRecurring}</p><h2 id="recurring-modal-title">{rule ? t.editRecurringTitle : t.newRecurringTitle}</h2></div><button className="icon-button" onClick={onClose} aria-label={t.close}><X size={19} /></button></div>
      <div className="type-switch" role="group" aria-label={t.transactionType}>
        <button type="button" className={type === 'expense' ? 'selected expense-selected' : ''} onClick={() => changeType('expense')}><ArrowUpRight size={16} /> {t.expense}</button>
        <button type="button" className={type === 'income' ? 'selected income-selected' : ''} onClick={() => changeType('income')}><ArrowDownLeft size={16} /> {t.income.charAt(0) + t.income.slice(1).toLowerCase()}</button>
      </div>
      <form onSubmit={submit}>
        <label className="field-label" htmlFor="recurring-title">{t.whatFor}</label>
        <input id="recurring-title" autoFocus placeholder={t.recurringTitlePlaceholder} value={title} onChange={(event) => setTitle(event.target.value)} />
        <div className="form-row">
          <div><label className="field-label" htmlFor="recurring-amount">{t.amountEuro}</label><div className="amount-input"><span>€</span><input id="recurring-amount" type="number" min="0.01" step="0.01" placeholder="0.00" value={amount} onChange={(event) => setAmount(event.target.value)} /></div></div>
          <div><label className="field-label" htmlFor="recurring-day">{t.dayOfMonth}</label><div className="amount-input"><input id="recurring-day" type="number" min="1" max="31" step="1" value={day} onChange={(event) => setDay(event.target.value)} /></div></div>
        </div>
        <label className="field-label" htmlFor="recurring-category">{t.categoryLabel}</label>
        <div className="select-wrap"><select id="recurring-category" value={category} onChange={(event) => setCategory(event.target.value)}>{options.map((name) => <option key={name} value={name}>{t.categoryNames[name] || name}</option>)}</select></div>
        <PlatformSelector id="recurring-platform" label={t.platform} value={platform} onChange={setPlatform} />
        <p className="form-note">{t.recurringNote}</p>
        {error && <p className="form-error">{error}</p>}
        <button className="submit-button" type="submit">{rule ? <Check size={17} /> : <Plus size={17} />} {rule ? t.saveChanges : t.addRecurring}</button>
      </form>
    </section>
  </div>
}
