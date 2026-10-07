import { useState } from 'react'
import { CalendarClock, Pencil, Plus, Repeat, X } from 'lucide-react'
import IconBadge from '../ui/IconBadge.jsx'
import RecurringModal from './RecurringModal.jsx'
import { useI18n } from '../../i18n/LanguageProvider.jsx'
import { useFinance } from '../../context/FinanceProvider.jsx'
import { categoryInfo } from '../../data/categories.js'
import { formatCurrency } from '../../lib/format.js'
import { formatMonthLabel, monthKey } from '../../lib/dates.js'
import { dayHasPassed, nextMonth } from '../../lib/recurring.js'

/** The month a rule will next fire, or null while it is paused. */
function nextRunMonth(rule, today) {
  if (rule.active === false) return null
  const current = monthKey(today)
  // Still to start.
  if (rule.startMonth > current) return rule.startMonth
  // This month is already generated, so the next one is after it.
  if (rule.lastGeneratedMonth && rule.lastGeneratedMonth >= current) return nextMonth(rule.lastGeneratedMonth)
  // Otherwise it is this month if the day is still ahead, else next month.
  return dayHasPassed(rule.dayOfMonth, today) ? nextMonth(current) : current
}

/** Recurring rules and the transactions they generate. */
export default function RecurringPage() {
  const { t, language } = useI18n()
  const { recurringRules, saveRecurringRule, removeRecurringRule } = useFinance()
  const [editing, setEditing] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const today = new Date()

  function closeModal() {
    setShowModal(false)
    setEditing(null)
  }

  function save(rule) {
    saveRecurringRule(rule)
    closeModal()
  }

  return <div className="page-content">
    <section className="welcome-row"><div><p className="eyebrow">{t.recurringEyebrow}</p><h1>{t.recurringHeading}<span>.</span></h1><p className="welcome-sub">{t.recurringSubtitle}</p></div><button className="primary-button" onClick={() => setShowModal(true)}><Plus size={18} strokeWidth={2.4} /> {t.addRecurring}</button></section>

    <section className="panel recurring-panel">
      <div className="panel-heading"><div><h2>{t.recurringRules}</h2><p>{t.recurringRulesSubtitle}</p></div><span className="panel-icon"><Repeat size={17} /></span></div>
      {recurringRules.length ? <div className="recurring-list">
        {recurringRules.map((rule) => {
          const info = categoryInfo(rule.category, rule.type)
          const month = nextRunMonth(rule, today)
          const isActive = rule.active !== false
          return <div className={isActive ? 'recurring-row' : 'recurring-row paused-rule'} key={rule.id}>
            <IconBadge icon={info.icon} color={info.color} />
            <div className="recurring-main">
              <strong>{rule.title}</strong>
              <span>{t.categoryNames[rule.category] || rule.category} · {t.everyMonthOnDay.replace('{day}', rule.dayOfMonth)}</span>
            </div>
            <span className="recurring-next">{month ? formatMonthLabel(month, language) : t.pausedRule}</span>
            <span className={`recurring-amount ${rule.type}`}>{rule.type === 'income' ? '+' : '−'}{formatCurrency(rule.amount, language)}</span>
            <button type="button" className={isActive ? 'visibility-switch switch-on' : 'visibility-switch'} role="switch" aria-checked={isActive} aria-label={`${t.activeRule}: ${rule.title}`} onClick={() => saveRecurringRule({ ...rule, active: !isActive })}><span /></button>
            <div className="transaction-actions">
              <button className="edit-row" onClick={() => setEditing(rule)} aria-label={`${t.edit} ${rule.title}`} title={t.edit}><Pencil size={15} /></button>
              <button className="delete-row" onClick={() => removeRecurringRule(rule.id)} aria-label={`${t.delete} ${rule.title}`} title={t.delete}><X size={15} /></button>
            </div>
          </div>
        })}
      </div> : <div className="empty-transactions"><span className="empty-icon"><CalendarClock size={21} /></span><strong>{t.noRecurring}</strong><p>{t.noRecurringHint}</p><button className="text-button" onClick={() => setShowModal(true)}><Plus size={15} /> {t.addRecurring}</button></div>}
      {recurringRules.length > 0 && <p className="visibility-note">{t.recurringFootnote}</p>}
    </section>

    {(showModal || editing) && <RecurringModal rule={editing} onClose={closeModal} onSave={save} />}
  </div>
}
