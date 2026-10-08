import { useMemo } from 'react'
import { CalendarClock, Flame, PiggyBank, SlidersHorizontal, TrendingUp, Wallet } from 'lucide-react'
import FireProjectionChart from './FireProjectionChart.jsx'
import { useI18n } from '../../i18n/LanguageProvider.jsx'
import { useSettings } from '../../context/SettingsProvider.jsx'
import { usePortfolioSummary } from '../../hooks/usePortfolioSummary.js'
import { useFireProjection } from '../../hooks/useFireProjection.js'
import { projectSeries, projectionRange } from '../../lib/fire.js'
import { formatCurrency } from '../../lib/format.js'

/** Where the user's FIRE plan puts financial independence, and when. */
export default function FirePage() {
  const { t, locale, language } = useI18n()
  const { fireEstimate } = useSettings()
  const today = useMemo(() => new Date(), [])
  const { globalPosition } = usePortfolioSummary(today)
  const projection = useFireProjection(globalPosition)

  // The plan owns the goal, so there is nothing to compare it against.
  const goalValue = projection.target
  const ratePercent = Number((projection.withdrawalRate * 100).toFixed(2))
  const multiple = projection.withdrawalRate > 0 ? Math.round(1 / projection.withdrawalRate) : 0
  const hasData = goalValue > 0

  // Room for the spread: the plan's date plus half again, so the slow half of
  // the simulated futures is visible rather than clipped at the target date.
  const horizon = projection.years == null ? 30 : Math.min(50, Math.max(10, Math.ceil(projection.years * 1.5)))
  const series = useMemo(
    () => projectSeries({ current: projection.current, annualSavings: projection.savings, years: horizon }),
    [projection.current, projection.savings, horizon],
  )

  // The same plan, run many times with the returns shuffled. The seed is fixed
  // so the range does not jitter on every render. The band runs to the end of
  // the chart, but the odds are asked against the date the plan predicts.
  const range = useMemo(
    () => projectionRange({ current: projection.current, annualSavings: projection.savings, target: goalValue, realReturn: projection.realReturn, years: horizon, within: projection.years == null ? null : Math.ceil(projection.years) }),
    [projection.current, projection.savings, goalValue, projection.realReturn, horizon, projection.years],
  )

  const progress = goalValue > 0 ? Math.min(100, (projection.current / goalValue) * 100) : 0
  const savingsRate = projection.income > 0 ? (projection.savings / projection.income) * 100 : 0
  const years = projection.years == null ? null : Math.ceil(projection.years)
  const spread = range.p10 != null && range.p90 != null && range.p10 !== range.p90

  const stats = [
    { key: 'position', icon: <Wallet size={16} />, tint: 'savings-tint', label: t.currentPosition, value: formatCurrency(projection.current, language), note: `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(progress)}% ${t.ofGoal}` },
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
          <p className="eyebrow">{t.fireHorizon}</p>
          {projection.reached
            ? <strong className="fire-hero-number">{t.fireReachedShort}</strong>
            : years == null
              ? <strong className="fire-hero-number">{t.fireOffTrackShort}</strong>
              : <strong className="fire-hero-number">{years}<span>{years === 1 ? t.yearToFire : t.yearsToFire}</span></strong>}
          <p className="fire-hero-note">
            {projection.reached
              ? t.fireReachedNote
              : years == null
                ? t.fireOffTrackNote
                : <>
                  <span>{t.fireRangeOdds.replace('{rate}', Math.round(range.successRate * 100)).replace('{years}', range.within)}</span>
                  {spread && <> <span className="fire-hero-odds">{t.fireRange.replace('{low}', range.p10).replace('{high}', range.p90)}</span></>}
                </>}
          </p>
        </div>
        <div className="fire-hero-meter">
          <div className="fire-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(progress)}>
            <span style={{ width: `${progress}%` }} />
          </div>
          <div className="fire-progress-legend">
            <span>{formatCurrency(projection.current, language)}</span>
            <span>{formatCurrency(goalValue, language)}</span>
          </div>
        </div>
      </section>

      <section className="panel fire-plan-summary">
        <div className="panel-heading"><div><h2>{t.firePlanSummary}</h2><p>{t.firePlanSummarySubtitle}</p></div><span className="panel-icon"><SlidersHorizontal size={17} /></span></div>
        <p className="fire-plan-tag">{t.firePlanTag.replace('{strategy}', t.fireStrategies[projection.strategy]).replace('{rate}', ratePercent)}</p>
        <div className="fire-plan-figure">
          <span>{t.firePlanNumber}</span>
          <strong>{formatCurrency(goalValue, language)}</strong>
          <small>{t.fireNumberNote.replace('{amount}', formatCurrency(projection.spendingToCover, language)).replace('{rate}', ratePercent)}</small>
        </div>
        <p className="fire-plan-hint">{t.firePlanEditHint}</p>
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
        <FireProjectionChart series={series} band={range.band} target={goalValue} startYear={today.getFullYear()} language={language} />
      </section>

      <section className="panel fire-assumptions">
        <div className="panel-heading"><div><h2>{t.fireAssumptions}</h2><p>{t.fireAssumptionsSubtitle}</p></div><span className="panel-icon"><Flame size={17} /></span></div>
        <ul className="fire-assumption-list">
          <li>{t.fireAssumptionRule.replace('{rate}', ratePercent).replace('{multiple}', multiple)}</li>
          <li>{t.fireAssumptionReturn.replace('{rate}', `${(projection.realReturn * 100).toFixed(0)}%`)}</li>
          <li>{t.fireAssumptionInvest}</li>
          <li>{t.fireAssumptionData.replace('{months}', projection.months).replace('{window}', Math.min(12, projection.months))}</li>
        </ul>
      </section>
    </>}
  </div>
}
