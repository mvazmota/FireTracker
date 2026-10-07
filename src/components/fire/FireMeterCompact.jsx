import { Flame, Pencil } from 'lucide-react'
import { formatCurrency } from '../../lib/format.js'
import { messages } from '../../i18n/messages.jsx'

export default function FireMeterCompact({ language, position, goal, onEdit }) {
  const t = messages[language]
  const locale = language === 'pt' ? 'pt-PT' : 'en-IE'
  const progress = goal > 0 ? (position / goal) * 100 : 0
  const barWidth = Math.max(0, Math.min(100, progress))
  const remaining = Math.max(0, goal - position)
  return <button type="button" className="fire-compact" onClick={onEdit} aria-label={`${t.fireGoal}: ${Math.max(0, progress).toFixed(1)}%`}>
    <span className="fire-compact-head"><span className="fire-compact-icon"><Flame size={13} fill="currentColor" /></span><span className="fire-compact-label">{t.fireLabel}</span><strong>{new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(Math.max(0, progress))}%</strong></span>
    <span className="fire-compact-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(barWidth)}><span style={{ width: `${barWidth}%` }} /></span>
    <span className="fire-compact-foot"><span>{formatCurrency(position, language)} <i>/</i> {formatCurrency(goal, language)}</span><span className="fire-compact-edit"><Pencil size={11} /></span></span>
    <span className="fire-compact-note">{progress >= 100 ? t.fireAchieved : `${formatCurrency(remaining, language)} ${t.fireRemaining}`}</span>
  </button>
}
