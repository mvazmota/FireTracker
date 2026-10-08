import { useMemo } from 'react'
import { CalendarClock, Flame, PiggyBank, Scale, TrendingUp, Wallet } from 'lucide-react'
import FireProjectionChart from './FireProjectionChart.jsx'
import { useI18n } from '../../i18n/LanguageProvider.jsx'
import { useFinance } from '../../context/FinanceProvider.jsx'
import { useSettings } from '../../context/SettingsProvider.jsx'
import { usePortfolioSummary } from '../../hooks/usePortfolioSummary.js'
import { compareGoal, estimateProjection, fireProjection, projectSeries, yearsToTarget } from '../../lib/fire.js'
import { formatCurrency } from '../../lib/format.js'

/** Where the 4% rule puts financial independence, and when. */
export default function FirePage() {
  const { t, locale, language } = useI18n()
  const { transactions } = useFinance()
  const { fireGoal, fireEstimate } = useSettings()
  const today = useMemo(() => new Date(), [])
  const { globalPosition } = usePortfolioSummary(today)

  // Real numbers once there is history to average; the onboarding answers until then.
  const fromData = useMemo(
    () => fireProjection({ transactions, currentPosition: globalPosition, today }),
    [transactions, globalPosition, today],
  )
  const fromEstimate = useMemo(
    () => estimateProjection({ estimate: fireEstimate, currentPosition: globalPosition, today }),
    [fireEstimate, globalPosition, today],
  )
  const projection = fromData.target > 0 ? fromData : fromEstimate

  // The goal the user set, measured against the number their spending implies.
  const comparison = compareGoal({ goal: fireGoal, projected: projection.target })
  const goalValue = comparison.goal > 0 ? comparison.goal : comparison.projected
  const goalYears = yearsToTarget({ current: globalPosition, annualSavings: projection.savings, target: goalValue, realReturn: projection.realReturn })
  const goalReached = goalValue > 0 && globalPosition >= goalValue

  const horizon = goalYears == null ? 30 : Math.min(50, Math.ceil(goalYears) + 2)
  const series = useMemo(
    () => projectSeries({ current: globalPosition, annualSavings: projection.savings, years: horizon }),
    [globalPosition, projection.savings, horizon],
  )

  const hasData = projection.target > 0
  const progress = goalValue > 0 ? Math.min(100, (globalPosition / goalValue) * 100) : 0
  const savingsRate = projection.income > 0 ? (projection.savings / projection.income) * 100 : 0
  const years = goalYears == null ? null : Math.ceil(goalYears)
  const targetDate = goalYears == null
    ? null
    : new Date(today.getFullYear(), today.getMonth() + Math.ceil(goalYears * 12), 1)
  const targetDateLabel = targetDate
    ? new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(targetDate)
    : null

  const stats = [
    { key: 'position', icon: <Wallet size={16} />, tint: 'savings-tint', label: t.currentPosition, value: formatCurrency(globalPosition, language), note: `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(progress)}% ${t.ofGoal}` },
    { key: 'savings', icon: <PiggyBank size={16} />, tint: 'etf-tint', label: t.annualSavings, value: formatCurrency(projection.savings, language), note: `${savingsRate.toFixed(0)}% ${t.ofIncome}` },
    { key: 'spending', icon: <TrendingUp size={16} />, tint: 'p2p-tint', label: t.annualSpending, value: formatCurrency(projection.expenses, language), note: `${projection.months} ${projection.months === 1 ? t.monthOfData : t.monthsOfData}` },
    { key: 'monthly', icon: <Flame size={16} />, tint: 'fire-tint', label: t.fireMonthlySavings, value: formatCurrency(projection.savings / 12, language), note: t.fireMonthlySavingsNote },
  ]

  return <div className="page-content">
    <section className="welcome-row"><div><p className="eyebrow">{t.fireEyebrow}</p><h1>{t.fireHeading}<span>.</span></h1><p className="welcome-sub">{t.fireSubtitle}</p></div></section>

    {!hasData ? <section className="panel fire-empty">
      <span className="empty-icon"><Flame size={21} /></span>
      <strong>{t.fireNoData}</strong>
      <p>{t.fireNoDataHint}</p>
    </section> : <>

      <section className="panel fire-hero">
        <div className="fire-hero-copy">
          <p className="eyebrow">{t.fireHorizonGoal}</p>
          {goalReached
            ? <strong className="fire-hero-number">{t.fireReachedShort}</strong>
            : years == null
              ? <strong className="fire-hero-number">{t.fireOffTrackShort}</strong>
              : <strong className="fire-hero-number">{years}<span>{years === 1 ? t.yearToFire : t.yearsToFire}</span></strong>}
          <p className="fire-hero-note">
            {goalReached ? t.fireReachedNote : years == null ? t.fireOffTrackNote : `${t.fireAround} ${targetDateLabel}`}
          </p>
        </div>
        <div className="fire-hero-meter">
          <div className="fire-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(progress)}>
            <span style={{ width: `${progress}%` }} />
          </div>
          <div className="fire-progress-legend">
            <span>{formatCurrency(globalPosition, language)}</span>
            <span>{formatCurrency(goalValue, language)}</span>
          </div>
        </div>
      </section>

      <section className="panel fire-compare">
        <div className="panel-heading"><div><h2>{t.fireCompare}</h2><p>{t.fireCompareSubtitle}</p></div><span className="panel-icon"><Scale size={17} /></span></div>
        <div className="fire-compare-grid">
          <div className="fire-compare-item">
            <span className="fire-compare-label">{t.fireYourTarget}</span>
            <strong>{formatCurrency(comparison.goal, language)}</strong>
            <small>{t.fireCovers.replace('{amount}', formatCurrency(comparison.cover, language))}</small>
          </div>
          <div className="fire-compare-item">
            <span className="fire-compare-label">{t.fireYourNumber}</span>
            <strong>{formatCurrency(comparison.projected, language)}</strong>
            <small>{t.fireImplies.replace('{amount}', formatCurrency(projection.expenses, language))}</small>
          </div>
        </div>
        <p className={comparison.enough ? 'fire-verdict verdict-ok' : 'fire-verdict verdict-warn'}>
          {comparison.enough ? t.fireGoalEnough : t.fireGoalShort.replace('{amount}', formatCurrency(comparison.projected, language))}
        </p>
        {projection.estimated
          ? <p className="visibility-note">{t.fireFromEstimate}</p>
          : fireEstimate?.spending > 0 && projection.months > 0
            ? <p className="visibility-note">{t.fireEstimateCompare.replace('{estimate}', formatCurrency(fireEstimate.spending, language)).replace('{actual}', formatCurrency(projection.expenses, language))}</p>
            : null}
      </section>

      <section className="summary-grid fire-stats" aria-label={t.fireStatsLabel}>
        {stats.map((item) => <article className="summary-card" key={item.key}>
          <div className="summary-label">{item.label}<span className={`summary-symbol ${item.tint}`}>{item.icon}</span></div>
          <div className="summary-amount">{item.value}</div>
          <div className="summary-foot"><span>{item.note}</span></div>
        </article>)}
      </section>

      <section className="panel fire-chart-panel">
        <div className="panel-heading"><div><h2>{t.fireProjection}</h2><p>{t.fireProjectionSubtitle}</p></div><span className="panel-icon"><CalendarClock size={17} /></span></div>
        <FireProjectionChart series={series} target={goalValue} startYear={today.getFullYear()} language={language} />
      </section>

      <section className="panel fire-assumptions">
        <div className="panel-heading"><div><h2>{t.fireAssumptions}</h2><p>{t.fireAssumptionsSubtitle}</p></div><span className="panel-icon"><Flame size={17} /></span></div>
        <ul className="fire-assumption-list">
          <li>{t.fireAssumptionRule}</li>
          <li>{t.fireAssumptionReturn.replace('{rate}', `${(projection.realReturn * 100).toFixed(0)}%`)}</li>
          <li>{t.fireAssumptionInvest}</li>
          <li>{t.fireAssumptionData.replace('{months}', projection.months).replace('{window}', Math.min(12, projection.months))}</li>
        </ul>
      </section>
    </>}
  </div>
}
