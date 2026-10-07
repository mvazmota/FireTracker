import PlatformSelector from '../ui/PlatformSelector.jsx'
import { useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, CalendarDays, Check, ChevronDown, Clock, Plus, X } from 'lucide-react'
import { monthKey, normalizeTransactionDate, timeStamp } from '../../lib/dates.js'
import { categories } from '../../data/categories.js'
import { useI18n } from '../../i18n/LanguageProvider.jsx'
import { useSettings } from '../../context/SettingsProvider.jsx'
export default function TransactionModal({ onClose, onSave, selectedMonth, transaction }) {
  const { platforms, customCategories } = useSettings()
  const { t, locale, language } = useI18n()
  const [type, setType] = useState(transaction?.type || 'expense')
  const [title, setTitle] = useState(transaction?.title || '')
  const [amount, setAmount] = useState(transaction ? String(transaction.amount) : '')
  const [category, setCategory] = useState(transaction?.category || categories.expense[0].name)
  const [platform, setPlatform] = useState(transaction?.platform || '')
  const [creatingCategory, setCreatingCategory] = useState(false)
  const [newCategory, setNewCategory] = useState('')
  const now = new Date()
  const fallbackDay = Math.min(now.getDate(), new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).getDate())
  const fallbackDateTime = monthKey(selectedMonth) === monthKey(now) ? timeStamp(now) : `${monthKey(selectedMonth)}-${String(fallbackDay).padStart(2, '0')}T12:00:00`
  const initialDateTime = transaction?.date ? normalizeTransactionDate(transaction.date) : fallbackDateTime
  const [date, setDate] = useState(initialDateTime.slice(0, 10))
  const [time, setTime] = useState(initialDateTime.slice(11, 16))
  const [error, setError] = useState('')
  const customEntries = [...(customCategories[type] || []).map((name) => ({ name })), ...(category && !categories[type].some((item) => item.name === category) && !(customCategories[type] || []).includes(category) ? [{ name: category }] : [])]
  const categoryOptions = [...categories[type], ...customEntries]

  function changeType(nextType) {
    setType(nextType)
    setCategory(categories[nextType][0].name)
    setCreatingCategory(false)
    setNewCategory('')
  }

  function submit(event) {
    event.preventDefault()
    if (!title.trim()) return setError(t.nameError)
    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) return setError(t.amountError)
    if (date.slice(0, 7) !== monthKey(selectedMonth)) return setError(t.dateError)
    const finalCategory = creatingCategory ? newCategory.trim() : category
    if (!finalCategory) return setError(t.categoryNameError)
    const timeValue = /^\d{2}:\d{2}$/.test(time) ? time : '12:00'
    onSave({ id: transaction?.id || crypto.randomUUID(), title: title.trim(), category: finalCategory, type, amount: Number(amount), date: `${date}T${timeValue}:00`, platform: platform.trim() })
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-top"><div><p className="eyebrow">{transaction ? t.editTransaction : t.newTransaction}</p><h2 id="modal-title">{transaction ? t.updateTransaction : t.addToMonth}</h2></div><button className="icon-button" onClick={onClose} aria-label={t.close}><X size={19} /></button></div>
        <div className="type-switch" role="group" aria-label={t.transactionType}>
          <button type="button" className={type === 'expense' ? 'selected expense-selected' : ''} onClick={() => changeType('expense')}><ArrowUpRight size={16} /> {t.expense}</button>
          <button type="button" className={type === 'income' ? 'selected income-selected' : ''} onClick={() => changeType('income')}><ArrowDownLeft size={16} /> {t.income.charAt(0) + t.income.slice(1).toLowerCase()}</button>
        </div>
        <form onSubmit={submit}>
          <label className="field-label" htmlFor="transaction-title">{t.whatFor}</label>
          <input id="transaction-title" autoFocus placeholder={t.titlePlaceholder} value={title} onChange={(event) => setTitle(event.target.value)} />
          <div className="form-row">
            <div><label className="field-label" htmlFor="transaction-amount">{t.amountEuro}</label><div className="amount-input"><span>€</span><input id="transaction-amount" type="number" min="0.01" step="0.01" placeholder="0.00" value={amount} onChange={(event) => setAmount(event.target.value)} /></div></div>
            <div><label className="field-label" htmlFor="transaction-date">{t.date}</label><div className="date-input"><CalendarDays size={16} /><input id="transaction-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></div></div>
          </div>
          <div className="form-row">
            <div><label className="field-label" htmlFor="transaction-time">{t.time}</label><div className="date-input"><Clock size={16} /><input id="transaction-time" type="time" value={time} onChange={(event) => setTime(event.target.value)} /></div></div>
            <div><label className="field-label" htmlFor="transaction-category">{t.categoryLabel}</label>{creatingCategory ? <div className="platform-add-row"><input className="platform-custom-input" id="transaction-category" autoFocus placeholder={t.categoryName} value={newCategory} onChange={(event) => setNewCategory(event.target.value)} /><button className="icon-button" type="button" onClick={() => { setCreatingCategory(false); setNewCategory('') }} aria-label={t.useCategories}><X size={16} /></button></div> : <div className="select-wrap"><select id="transaction-category" value={category} onChange={(event) => { if (event.target.value === '__add_category__') { setCreatingCategory(true); setNewCategory('') } else setCategory(event.target.value) }}>{categoryOptions.map((item) => <option key={item.name} value={item.name}>{t.categoryNames[item.name] || item.name}</option>)}<option value="__add_category__">{t.addCategory}</option></select><ChevronDown size={16} /></div>}</div>
          </div>
          <PlatformSelector id="transaction-platform" label={t.platform} value={platform} onChange={setPlatform} />
          {error && <p className="form-error">{error}</p>}
          <button className="submit-button" type="submit">{transaction ? <Check size={17} /> : <Plus size={17} />} {transaction ? t.saveChanges : type === 'income' ? t.addIncome : t.addExpense}</button>
        </form>
      </section>
    </div>
  )
}
