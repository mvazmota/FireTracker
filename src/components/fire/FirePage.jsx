import { useMemo } from 'react'
import { CalendarClock, Flame, PiggyBank, TrendingUp, Wallet } from 'lucide-react'
import FireProjectionChart from './FireProjectionChart.jsx'
import { useI18n } from '../../i18n/LanguageProvider.jsx'
import { useFinance } from '../../context/FinanceProvider.jsx'
import { usePortfolioSummary } from '../../hooks/usePortfolioSummary.js'
import { fireProjection, projectSeries } from '../../lib/fire.js'
import { formatCurrency } from '../../lib/format.js'

/** Where the 4% rule puts financial independence, and when. */
export default function FirePage() {
  const { t, locale, language } = useI18n()
  const { transactions } = useFinance()
  const today = useMemo(() => new Date(), [])
  const { globalPosition } = usePortfolioSummary(today)

  const projection = useMemo(
    () => fireProjection({ transactions, currentPosition: globalPosition, today }),
    [transactions, globalPosition, today],
  )

  const horizon = projection.years == null ? 30 : Math.min(50, Math.ceil(projection.years) + 2)
  const series = useMemo(
    () => projectSeries({ current: globalPosition, annualSavings: projection.savings, years: horizon }),
    [globalPosition, projection.savings, horizon],
  )

  const hasData = projection.target > 0
  const progress = hasData ? Math.min(100, (globalPosition / projection.target) * 100) : 0
  const savingsRate = projection.income > 0 ? (projection.savings / projection.income) * 100 : 0
  const years = projection.years == null ? null : Math.ceil(projection.years)
  const targetDate = projection.targetDate
    ? new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(projection.targetDate)
    : null

  const stats = [
    { key: 'target', icon: <Flame size={16} />, tint: 'fire-tint', label: t.fireTargetLabel, value: formatCurrency(projection.target, language), note: t.fireTargetNote.replace('{amount}', formatCurrency(projection.expenses, language)) },
    { key: 'position', icon: <Wallet size={16} />, tint: 'savings-tint', label: t.currentPosition, value: formatCurrency(globalPosition, language), note: `${progress.toFixed(0)}% ${t.ofGoal}` },
    { key: 'savings', icon: <PiggyBank size={16} />, tint: 'etf-tint', label: t.annualSavings, value: formatCurrency(projection.savings, language), note: `${savingsRate.toFixed(0)}% ${t.ofIncome}` },
    { key: 'spending', icon: <TrendingUp size={16} />, tint: 'p2p-tint', label: t.annualSpending, value: formatCurrency(projection.expenses, language), note: `${projection.months} ${projection.months === 1 ? t.monthOfData : t.monthsOfData}` },
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
            {projection.reached ? t.fireReachedNote : years == null ? t.fireOffTrackNote : `${t.fireAround} ${targetDate}`}
          </p>
        </div>
        <div className="fire-hero-meter">
          <div className="fire-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(progress)}>
            <span style={{ width: `${progress}%` }} />
          </div>
          <div className="fire-progress-legend">
            <span>{formatCurrency(globalPosition, language)}</span>
            <span>{formatCurrency(projection.target, language)}</span>
          </div>
        </div>
      </section>

      <section className="summary-grid fire-stats" aria-label={t.fireTargetLabel}>
        {stats.map((item) => <article className="summary-card" key={item.key}>
          <div className="summary-label">{item.label}<span className={`summary-symbol ${item.tint}`}>{item.icon}</span></div>
          <div className="summary-amount">{item.value}</div>
          <div className="summary-foot"><span>{item.note}</span></div>
        </article>)}
      </section>

      <section className="panel fire-chart-panel">
        <div className="panel-heading"><div><h2>{t.fireProjection}</h2><p>{t.fireProjectionSubtitle}</p></div><span className="panel-icon"><CalendarClock size={17} /></span></div>
        <FireProjectionChart series={series} target={projection.target} startYear={today.getFullYear()} language={language} />
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
