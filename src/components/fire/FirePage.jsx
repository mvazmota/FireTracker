import { useMemo, useState } from 'react'
import { CalendarClock, Flame, PiggyBank, SlidersHorizontal, TrendingUp, Wallet } from 'lucide-react'
import FireProjectionChart from './FireProjectionChart.jsx'
import { useI18n } from '../../i18n/LanguageProvider.jsx'
import { useSettings } from '../../context/SettingsProvider.jsx'
import { usePortfolioSummary } from '../../hooks/usePortfolioSummary.js'
import { useFireProjection } from '../../hooks/useFireProjection.js'
import { FIRE_STRATEGIES, normalizePlan, planForStrategy, projectSeries, projectionRange } from '../../lib/fire.js'
import { formatCurrency } from '../../lib/format.js'

/** The FIRE plan, the projections it produces, and the two together. */
export default function FirePage() {
  const { t, locale, language } = useI18n()
  const { fireEstimate, firePlan, saveFirePlan } = useSettings()
  const today = useMemo(() => new Date(), [])
  const { globalPosition } = usePortfolioSummary(today)

  // The plan is edited on this page, so it lives here as a draft: everything
  // below follows each keystroke, and the draft is written when a field is left
  // rather than on a Save button.
  const stored = useMemo(() => normalizePlan(firePlan), [firePlan])
  const [strategy, setStrategy] = useState(stored.strategy)
  const [rateInput, setRateInput] = useState(String(Math.round(stored.withdrawalRate * 1000) / 10))
  const [returnInput, setReturnInput] = useState(String(Math.round(stored.realReturn * 1000) / 10))
  const [spendingInput, setSpendingInput] = useState(stored.retirementSpending == null ? '' : String(stored.retirementSpending))
  const [incomeInput, setIncomeInput] = useState(stored.postFireIncome > 0 ? String(stored.postFireIncome) : '')

  const draftPlan = useMemo(() => normalizePlan({
    strategy,
    withdrawalRate: Number(rateInput) / 100,
    realReturn: Number(returnInput) / 100,
    retirementSpending: spendingInput.trim() === '' ? null : Number(spendingInput),
    postFireIncome: Number(incomeInput) || 0,
  }), [strategy, rateInput, returnInput, spendingInput, incomeInput])

  const projection = useFireProjection(globalPosition, draftPlan)

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

  /** Writes what is on screen, so leaving a field keeps the change. */
  function commit() {
    saveFirePlan(draftPlan)
  }

  /** A strategy fills the fields in; every value stays editable afterwards. */
  function chooseStrategy(key) {
    if (key === 'custom') {
      setStrategy('custom')
      saveFirePlan({ ...draftPlan, strategy: 'custom' })
      return
    }
    const preset = normalizePlan(planForStrategy(key, { annualSpending: projection.expenses, annualIncome: projection.income }))
    setStrategy(preset.strategy)
    setRateInput(String(Math.round(preset.withdrawalRate * 1000) / 10))
    setReturnInput(String(Math.round(preset.realReturn * 1000) / 10))
    setSpendingInput(preset.retirementSpending == null ? '' : String(preset.retirementSpending))
    setIncomeInput(preset.postFireIncome > 0 ? String(preset.postFireIncome) : '')
    saveFirePlan(preset)
  }

  return <div className="page-content">
    <section className="welcome-row"><div><p className="eyebrow">{t.fireEyebrow}</p><h1>{t.fireHeading}<span>.</span></h1><p className="welcome-sub">{t.fireSubtitle}</p></div></section>

    <section className="panel fire-plan-summary">
      <div className="panel-heading"><div><h2>{t.firePlanSummary}</h2><p>{t.firePlanSummarySubtitle}</p></div><span className="panel-icon"><SlidersHorizontal size={17} /></span></div>

      <div className="fire-plan-strategies">
        {FIRE_STRATEGIES.map((key) => <button type="button" key={key} className={strategy === key ? 'onboarding-chip chip-on' : 'onboarding-chip'} aria-pressed={strategy === key} onClick={() => chooseStrategy(key)}>{t.fireStrategies[key]}</button>)}
      </div>
      <p className="fire-plan-hint">{t.fireStrategyHints[strategy]}</p>

      <div className="form-row">
        <div>
          <label className="field-label" htmlFor="fire-plan-rate">{t.firePlanRate}</label>
          <div className="amount-input"><input id="fire-plan-rate" type="number" min="1" max="10" step="any" value={rateInput} onChange={(event) => setRateInput(event.target.value)} onBlur={commit} /><span>%</span></div>
        </div>
        <div>
          <label className="field-label" htmlFor="fire-plan-return">{t.firePlanReturn}</label>
          <div className="amount-input"><input id="fire-plan-return" type="number" min="0" max="10" step="any" value={returnInput} onChange={(event) => setReturnInput(event.target.value)} onBlur={commit} /><span>%</span></div>
        </div>
      </div>
      <div className="form-row">
        <div>
          <label className="field-label" htmlFor="fire-plan-spending">{t.firePlanSpending}</label>
          <div className="amount-input"><span>€</span><input id="fire-plan-spending" type="number" min="0" step="any" placeholder={String(Math.round(projection.expenses))} value={spendingInput} onChange={(event) => setSpendingInput(event.target.value)} onBlur={commit} /></div>
        </div>
        <div>
          <label className="field-label" htmlFor="fire-plan-income">{t.firePlanIncome}</label>
          <div className="amount-input"><span>€</span><input id="fire-plan-income" type="number" min="0" step="any" placeholder="0" value={incomeInput} onChange={(event) => setIncomeInput(event.target.value)} onBlur={commit} /></div>
        </div>
      </div>
      <p className="fire-plan-hint">{t.firePlanSpendingHint}</p>

      <div className="fire-plan-figure">
        <span>{t.firePlanNumber}</span>
        <strong>{formatCurrency(goalValue, language)}</strong>
        <small>{t.fireNumberNote.replace('{amount}', formatCurrency(projection.spendingToCover, language)).replace('{rate}', ratePercent)}</small>
      </div>
      {projection.estimated
        ? <p className="visibility-note">{t.fireFromEstimate}</p>
        : fireEstimate?.spending > 0 && projection.months > 0
          ? <p className="visibility-note">{t.fireEstimateCompare.replace('{estimate}', formatCurrency(fireEstimate.spending, language)).replace('{actual}', formatCurrency(projection.expenses, language))}</p>
          : null}
    </section>

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
