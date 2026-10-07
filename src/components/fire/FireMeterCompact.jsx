import { Flame } from 'lucide-react'
import { useState } from 'react'
import { formatCurrency } from '../../lib/format.js'
import { useI18n } from '../../i18n/LanguageProvider.jsx'

/**
 * Compact FIRE meter shown in the sidebar.
 * Clicking it plays a short fire animation around the border; the goal is
 * edited from Profile & settings instead.
 */
export default function FireMeterCompact({ position, goal }) {
  const { t, locale, language } = useI18n()
  const [ignition, setIgnition] = useState(0)
  const progress = goal > 0 ? (position / goal) * 100 : 0
  const barWidth = Math.max(0, Math.min(100, progress))
  const remaining = Math.max(0, goal - position)
  // Alternating class names so every click replays the animation.
  const ignitionClass = ignition === 0 ? '' : ignition % 2 === 1 ? ' ignite-a' : ' ignite-b'

  return <button
    type="button"
    className={`fire-compact${ignitionClass}`}
    onClick={() => setIgnition((count) => count + 1)}
    aria-label={`${t.fireGoal}: ${Math.max(0, progress).toFixed(1)}%`}
  >
    <span className="fire-compact-head"><span className="fire-compact-icon"><Flame size={13} fill="currentColor" /></span><span className="fire-compact-label">{t.fireLabel}</span><strong>{new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(Math.max(0, progress))}%</strong></span>
    <span className="fire-compact-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(barWidth)}><span style={{ width: `${barWidth}%` }} /></span>
    <span className="fire-compact-foot"><span>{formatCurrency(position, language)} <i>/</i> {formatCurrency(goal, language)}</span></span>
    <span className="fire-compact-note">{progress >= 100 ? t.fireAchieved : `${formatCurrency(remaining, language)} ${t.fireRemaining}`}</span>
  </button>
}
