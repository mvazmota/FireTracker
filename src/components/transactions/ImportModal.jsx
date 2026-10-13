import { useState } from 'react'
import { Check, Trash2, X } from 'lucide-react'
import { useI18n } from '../../i18n/LanguageProvider.jsx'
import { useSettings } from '../../context/SettingsProvider.jsx'

/**
 * Shows what an import file was read as, so the user can correct it before it
 * is saved. Rows the file did not categorise are highlighted and block the
 * save until a category is picked — that is the one thing the file cannot know.
 */
export default function ImportModal({ rows, fileName, skipped, onClose, onSave }) {
  const { t } = useI18n()
  const { categories } = useSettings()
  const [items, setItems] = useState(() => rows.map((row) => ({ ...row })))

  const missing = items.filter((item) => !item.category)
  const ready = items.length > 0 && missing.length === 0

  function patch(id, changes) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...changes } : item)))
  }

  /** Changing the type can strand the category in a list it no longer belongs to. */
  function changeType(id, type) {
    setItems((current) => current.map((item) => (item.id === id
      ? { ...item, type, category: categories[type].includes(item.category) ? item.category : '' }
      : item)))
  }

  function submit(event) {
    event.preventDefault()
    if (!ready) return
    onSave(items.map(({ id, title, category, type, amount, date, platform }) => ({
      id,
      title: title.trim(),
      category,
      type,
      amount: Number(amount),
      date,
      platform,
    })))
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal bulk-entry-modal import-modal" role="dialog" aria-modal="true" aria-labelledby="import-title">
        <div className="modal-top">
          <div>
            <p className="eyebrow">{t.importTransactions.toUpperCase()}</p>
            <h2 id="import-title">{t.importTitle}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label={t.close}><X size={19} /></button>
        </div>
        <p className="bulk-entry-subtitle">
          {t.importSubtitle}
          {fileName && <span className="import-source"> · {fileName}</span>}
          {skipped > 0 && <span className="import-source"> · {t.importSkipped.replace('{count}', skipped)}</span>}
        </p>

        <form onSubmit={submit}>
          <div className="bulk-entry-table-wrap">
            <div className="import-entry-table">
              <div className="import-entry-head">
                <span>{t.date}</span>
                <span>{t.whatFor}</span>
                <span>{t.categoryLabel}</span>
                <span>{t.amountEuro}</span>
                <span>{t.transactionType}</span>
                <span />
              </div>
              {items.length ? items.map((item) => {
                const categoryOptions = [...categories[item.type], ...(item.category && !categories[item.type].includes(item.category) ? [item.category] : [])]
                return (
                  <div className={item.category ? 'import-entry-row' : 'import-entry-row import-needs-category'} key={item.id}>
                    <input
                      type="date"
                      value={item.date.slice(0, 10)}
                      onChange={(event) => patch(item.id, { date: event.target.value ? `${event.target.value}T${item.date.slice(11) || '12:00:00'}` : item.date })}
                      aria-label={t.date}
                    />
                    <input
                      type="text"
                      value={item.title}
                      onChange={(event) => patch(item.id, { title: event.target.value })}
                      aria-label={t.whatFor}
                    />
                    <div className="select-wrap">
                      <select
                        value={item.category}
                        onChange={(event) => patch(item.id, { category: event.target.value })}
                        aria-label={t.categoryLabel}
                      >
                        {!item.category && <option value="">{t.importChooseCategory}</option>}
                        {categoryOptions.map((name) => <option key={name} value={name}>{t.categoryNames[name] || name}</option>)}
                      </select>
                    </div>
                    <input
                      className="import-amount"
                      type="number"
                      min="0.01"
                      step="any"
                      value={item.amount}
                      onChange={(event) => patch(item.id, { amount: event.target.value })}
                      aria-label={t.amountEuro}
                    />
                    <div className="select-wrap">
                      <select
                        value={item.type}
                        onChange={(event) => changeType(item.id, event.target.value)}
                        aria-label={t.transactionType}
                      >
                        <option value="expense">{t.expense}</option>
                        <option value="income">{t.income}</option>
                      </select>
                    </div>
                    <button
                      className="icon-button bulk-remove"
                      type="button"
                      onClick={() => setItems((current) => current.filter((row) => row.id !== item.id))}
                      aria-label={t.importSkipRow}
                      title={t.importSkipRow}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )
              }) : <div className="bulk-empty">{t.importNoRows}</div>}
            </div>
          </div>

          <div className="bulk-entry-footer">
            <span className="bulk-count">{items.length} {t.transactions}</span>
            {missing.length > 0
              ? <span className="import-missing">{missing.length} {t.importNeedsCategory}</span>
              : <span className="import-ready"><Check size={14} /> {t.importAllReady}</span>}
            <button className="submit-button bulk-save" type="submit" disabled={!ready}>
              {t.importConfirm.replace('{count}', items.length)}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
