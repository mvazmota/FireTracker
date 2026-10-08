import { useEffect, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { dateKey, monthKey } from '../../lib/dates.js'
import { formatCurrency } from '../../lib/format.js'
import { useI18n } from '../../i18n/LanguageProvider.jsx'
import { useSettings } from '../../context/SettingsProvider.jsx'

function makeRow(defaults) {
  return {
    id: crypto.randomUUID(),
    title: '',
    category: defaults.category,
    type: defaults.type,
    amount: '',
    date: `${defaults.date}T12:00:00`,
    platform: defaults.platform,
  }
}

function rowErrors(row) {
  const errors = {}
  if (!row.title.trim()) errors.title = true
  if (!Number.isFinite(Number(row.amount)) || Number(row.amount) <= 0) errors.amount = true
  if (!row.category) errors.category = true
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(row.date)) errors.date = true
  return errors
}

export default function BulkEntryModal({ selectedMonth, onClose, onSave }) {
  const { categories, platforms } = useSettings()
  const { t, language } = useI18n()
  const now = new Date()
  const initialDate = monthKey(selectedMonth) === monthKey(now) ? dateKey(now) : `${monthKey(selectedMonth)}-01`

  const [defaultType, setDefaultType] = useState('expense')
  const [defaultCategory, setDefaultCategory] = useState(categories.expense[0] || '')
  const [defaultPlatform, setDefaultPlatform] = useState('')
  const [defaultDate, setDefaultDate] = useState(initialDate)
  const [rows, setRows] = useState(() => [makeRow({ category: categories.expense[0] || '', type: 'expense', date: initialDate, platform: '' })])
  const [showErrors, setShowErrors] = useState(false)
  const [focusId, setFocusId] = useState(null)

  useEffect(() => {
    if (!focusId) return
    const field = document.getElementById(`bulk-amount-${focusId}`)
    if (field) field.focus()
    setFocusId(null)
  }, [focusId])

  function changeDefaultType(nextType) {
    setDefaultType(nextType)
    setDefaultCategory(categories[nextType][0] || '')
  }

  function addRow() {
    const row = makeRow({ category: defaultCategory, type: defaultType, date: defaultDate, platform: defaultPlatform })
    setRows((current) => [...current, row])
    setFocusId(row.id)
  }

  function updateRow(id, patch) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }

  function changeRowType(id, nextType) {
    updateRow(id, { type: nextType, category: categories[nextType][0] || '' })
  }

  function removeRow(id) {
    setRows((current) => current.filter((row) => row.id !== id))
  }

  function submit(event) {
    event.preventDefault()
    const hasErrors = rows.some((row) => Object.keys(rowErrors(row)).length)
    if (hasErrors) return setShowErrors(true)
    onSave(rows.map((row) => ({
      id: row.id,
      title: row.title.trim(),
      category: row.category,
      type: row.type,
      amount: Number(row.amount),
      date: row.date,
      platform: row.platform.trim(),
    })))
  }

  const totalIncome = rows.filter((row) => row.type === 'income').reduce((sum, row) => sum + (Number(row.amount) || 0), 0)
  const totalExpense = rows.filter((row) => row.type === 'expense').reduce((sum, row) => sum + (Number(row.amount) || 0), 0)
  const net = totalIncome - totalExpense

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal bulk-entry-modal" role="dialog" aria-modal="true" aria-labelledby="bulk-entry-title">
        <div className="modal-top">
          <div>
            <p className="eyebrow">{t.addMany.toUpperCase()}</p>
            <h2 id="bulk-entry-title">{t.bulkEntryTitle}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label={t.close}><X size={19} /></button>
        </div>
        <p className="bulk-entry-subtitle">{t.bulkEntrySubtitle}</p>

        <div className="bulk-entry-toolbar">
          <span className="bulk-defaults-label">{t.bulkDefaults}</span>
          <label className="bulk-field">
            <span>{t.date}</span>
            <input type="date" value={defaultDate} onChange={(event) => setDefaultDate(event.target.value)} />
          </label>
          <label className="bulk-field">
            <span>{t.transactionType}</span>
            <div className="select-wrap">
              <select value={defaultType} onChange={(event) => changeDefaultType(event.target.value)}>
                <option value="expense">{t.expense}</option>
                <option value="income">{t.income}</option>
              </select>
            </div>
          </label>
          <label className="bulk-field">
            <span>{t.categoryLabel}</span>
            <div className="select-wrap">
              <select value={defaultCategory} onChange={(event) => setDefaultCategory(event.target.value)}>
                {categories[defaultType].map((name) => <option key={name} value={name}>{t.categoryNames[name] || name}</option>)}
              </select>
            </div>
          </label>
          <label className="bulk-field">
            <span>{t.platform}</span>
            <div className="select-wrap">
              <select value={defaultPlatform} onChange={(event) => setDefaultPlatform(event.target.value)}>
                <option value="">{t.noPlatform}</option>
                {platforms.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </div>
          </label>
        </div>

        <form onSubmit={submit}>
          <div className="bulk-entry-table-wrap">
            <div className="bulk-entry-table">
              <div className="bulk-entry-head">
                <span>{t.date}</span>
                <span>{t.whatFor}</span>
                <span>{t.categoryLabel}</span>
                <span>{t.platform}</span>
                <span>{t.amountEuro}</span>
                <span>{t.transactionType}</span>
                <span />
              </div>
              {rows.length ? rows.map((row) => {
                const errors = showErrors ? rowErrors(row) : {}
                const categoryOptions = [...categories[row.type], ...(row.category && !categories[row.type].includes(row.category) ? [row.category] : [])]
                return (
                  <div className={Object.keys(errors).length ? 'bulk-entry-row bulk-row-invalid' : 'bulk-entry-row'} key={row.id}>
                    <input
                      type="date"
                      value={row.date.slice(0, 10)}
                      onChange={(event) => {
                        const value = event.target.value
                        updateRow(row.id, { date: value ? `${value}T${row.date.length > 11 ? row.date.slice(11) : '12:00:00'}` : '' })
                      }}
                      className={errors.date ? 'bulk-input-invalid' : ''}
                      aria-label={t.date}
                    />
                    <input
                      type="text"
                      value={row.title}
                      onChange={(event) => updateRow(row.id, { title: event.target.value })}
                      placeholder={t.titlePlaceholder}
                      className={errors.title ? 'bulk-input-invalid' : ''}
                      onKeyDown={(event) => event.key === 'Enter' && event.preventDefault()}
                      aria-label={t.whatFor}
                    />
                    <div className="select-wrap">
                      <select
                        value={row.category}
                        onChange={(event) => updateRow(row.id, { category: event.target.value })}
                        className={errors.category ? 'bulk-input-invalid' : ''}
                        onKeyDown={(event) => event.key === 'Enter' && event.preventDefault()}
                        aria-label={t.categoryLabel}
                      >
                        {categoryOptions.map((name) => <option key={name} value={name}>{t.categoryNames[name] || name}</option>)}
                      </select>
                    </div>
                    <div className="select-wrap">
                      <select
                        value={row.platform}
                        onChange={(event) => updateRow(row.id, { platform: event.target.value })}
                        onKeyDown={(event) => event.key === 'Enter' && event.preventDefault()}
                        aria-label={t.platform}
                      >
                        <option value="">{t.noPlatform}</option>
                        {platforms.map((name) => <option key={name} value={name}>{name}</option>)}
                      </select>
                    </div>
                    <input
                      id={`bulk-amount-${row.id}`}
                      type="number"
                      min="0.01"
                      step="any"
                      value={row.amount}
                      onChange={(event) => updateRow(row.id, { amount: event.target.value })}
                      placeholder="0.00"
                      className={errors.amount ? 'bulk-input-invalid' : ''}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          addRow()
                        }
                      }}
                      aria-label={t.amountEuro}
                    />
                    <div className="select-wrap">
                      <select
                        value={row.type}
                        onChange={(event) => changeRowType(row.id, event.target.value)}
                        onKeyDown={(event) => event.key === 'Enter' && event.preventDefault()}
                        aria-label={t.transactionType}
                      >
                        <option value="expense">{t.expense}</option>
                        <option value="income">{t.income}</option>
                      </select>
                    </div>
                    <button className="icon-button bulk-remove" type="button" onClick={() => removeRow(row.id)} aria-label={t.bulkRemoveRow}><X size={15} /></button>
                  </div>
                )
              }) : <div className="bulk-empty">{t.bulkEmpty}</div>}
            </div>
          </div>

          <button className="text-button bulk-add-row" type="button" onClick={addRow}><Plus size={15} /> {t.bulkAddRow}</button>

          <div className="bulk-entry-footer">
            <span className="bulk-count">{rows.length} {t.transactions}</span>
            <span className="bulk-total">{t.income} {formatCurrency(totalIncome, language)}</span>
            <span className="bulk-total">{t.expenses} {formatCurrency(totalExpense, language)}</span>
            <span className="bulk-total">{t.bulkNet} {formatCurrency(net, language)}</span>
            <button className="submit-button bulk-save" type="submit">{t.bulkSaveAll}</button>
          </div>
        </form>
      </section>
    </div>
  )
}
