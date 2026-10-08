import { useMemo, useState } from 'react'
import {
  ArrowDownLeft, ArrowLeft, ArrowRight, ArrowUpRight, CalendarDays, ChartLine,
  Check, Coffee, Pencil, Plus, Sparkles, TrendingUp, Wallet, X,
} from 'lucide-react'
import { formatCurrency } from '../../lib/format.js'
import { dateForMonth, formatDateTime } from '../../lib/dates.js'
import { categoryInfo } from '../../data/categories.js'
import { useI18n } from '../../i18n/LanguageProvider.jsx'
import { usePortfolioSummary } from '../../hooks/usePortfolioSummary.js'
import { buildPositionTimeline } from '../../lib/timeline.js'
import { INVESTMENT_CATEGORIES } from '../../lib/constants.js'
import IconBadge from '../ui/IconBadge.jsx'
import SpendingBreakdown from '../charts/SpendingBreakdown.jsx'
import CashFlowChart from '../charts/CashFlowChart.jsx'
import IncomeBreakdown from '../charts/IncomeBreakdown.jsx'
import IncomeTrendChart from '../charts/IncomeTrendChart.jsx'
import PositionEvolutionChart from '../charts/PositionEvolutionChart.jsx'
import FireMeterCompact from '../fire/FireMeterCompact.jsx'

const TABS = [
  { key: 'spending', icon: ArrowUpRight },
  { key: 'earning', icon: ArrowDownLeft },
  { key: 'investing', icon: ChartLine },
]

/** A percentage change against last month, coloured by whether it is good. */
function Delta({ value, invert = false }) {
  if (value == null) return <span className="delta-chip">—</span>
  const good = invert ? value <= 0 : value >= 0
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return <span className={`delta-chip ${good ? 'delta-good' : 'delta-bad'}`}>{sign}{Math.abs(value).toFixed(0)}%</span>
}

/**
 * The overview, organised around the three things a month of money actually
 * is: what was spent, what was earned and what was invested.
 *
 * The balance and the saving rate sit above the tabs because they are the
 * relationship between earning and spending, not part of either.
 */
export default function OverviewPage({
  summary, fire, selectedMonth, onShiftMonth, onToday,
  hasVisibleInvestments, investmentVisibility,
  onAddTransaction, onEditTransaction, onDeleteTransaction,
  onSelectPortfolioPage, fireMeterVisible,
  transactions, records,
}) {
  const { t, locale, language } = useI18n()
  const [activeTab, setActiveTab] = useState('spending')
  const [range, setRange] = useState('12')

  const prevMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1)
  const previousSummary = usePortfolioSummary(prevMonth)

  const {
    monthlyTransactions, recentTransactions, totals, net, monthlyInvested,
    cashSavedThisMonth, savingsRate, trackedCash, globalPosition, totalPortfolioValue, values,
  } = summary
  const savings = savingsRate

  const monthTitle = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(selectedMonth)

  const ETFInvested = values.etfs.invested
  const ETFMarketValue = values.etfs.value
  const cryptoInvested = values.crypto.invested
  const cryptoMarketValue = values.crypto.value
  const p2pInvested = values.p2p.invested
  const p2pMarketValue = values.p2p.value
  const bondsInvested = values.bonds.invested
  const bondsMarketValue = values.bonds.value
  const totalSavingsBalance = values.savings.value

  const expenseDelta = previousSummary.totals.expense
    ? ((totals.expense - previousSummary.totals.expense) / previousSummary.totals.expense) * 100
    : null
  const incomeDelta = previousSummary.totals.income
    ? ((totals.income - previousSummary.totals.income) / previousSummary.totals.income) * 100
    : null

  // The biggest category, leaving out the transfers into investments and
  // savings — those are not spending, they are money moved aside.
  const topSpending = monthlyTransactions
    .filter((item) => item.type === 'expense' && !INVESTMENT_CATEGORIES.includes(item.category) && item.category !== 'Savings')
    .reduce((result, item) => {
      result[item.category] = (result[item.category] || 0) + item.amount
      return result
    }, {})
  const topSpendingName = Object.entries(topSpending).sort((a, b) => b[1] - a[1])[0]

  const topIncome = monthlyTransactions
    .filter((item) => item.type === 'income')
    .reduce((result, item) => {
      result[item.category] = (result[item.category] || 0) + item.amount
      return result
    }, {})
  const topIncomeName = Object.entries(topIncome).sort((a, b) => b[1] - a[1])[0]

  const timeline = useMemo(
    () => buildPositionTimeline({ transactions, ...records, visibility: investmentVisibility }),
    [transactions, records, investmentVisibility],
  )
  const ranges = [['3', t.period3], ['6', t.period6], ['12', t.period12], ['24', t.period24], ['all', t.periodAll]]

  return (
    <div className="page-content">
      <section className="welcome-row"><div><p className="eyebrow">{t.snapshot}</p><h1>{t.headline}<span>.</span></h1><p className="welcome-sub">{t.welcome}</p></div><button className="primary-button" onClick={onAddTransaction}><Plus size={18} strokeWidth={2.4} /> {t.addTransaction}</button></section>

      <section className="month-toolbar" aria-label={t.selectMonth}><div className="month-nav"><button className="month-arrow" onClick={() => onShiftMonth(-1)} aria-label={t.previousMonth}><ArrowLeft size={17} /></button><div className="month-heading"><CalendarDays size={17} /><strong>{monthTitle}</strong></div><button className="month-arrow" onClick={() => onShiftMonth(1)} aria-label={t.nextMonth}><ArrowRight size={17} /></button></div><button className="today-button" onClick={onToday}>{t.today}</button></section>

      <section className="overview-relationship" aria-label={t.monthlySummary}>
        <article className="summary-card balance-card"><div className="summary-label">{t.balance}<span className="summary-symbol"><Wallet size={16} /></span></div><div className="summary-amount">{formatCurrency(cashSavedThisMonth, language)}</div><div className="summary-foot"><span className="trend-chip"><TrendingUp size={13} /> {savings.toFixed(0)}%</span><span>{t.cashSavedCaption}</span></div><div className="balance-art"><span /><span /><span /></div></article>
        <article className="summary-card"><div className="summary-label">{t.savingRate}<span className="summary-symbol savings-symbol"><Sparkles size={15} /></span></div><div className="summary-amount">{savings.toFixed(0)}<span className="percent">%</span></div><div className="summary-foot savings-breakdown-foot"><span>{t.cashSavedBreakdown}: {formatCurrency(cashSavedThisMonth, language)}</span><span>{t.investedBreakdown}: {formatCurrency(monthlyInvested, language)}</span></div><div className="card-progress"><span className="savings-progress" style={{ width: `${Math.max(0, Math.min(100, savings))}%` }} /></div></article>
      </section>

      <div className="overview-tabs" role="tablist" aria-label={t.overview}>
        {TABS.map((tab) => { const Icon = tab.icon; return <button key={tab.key} role="tab" aria-selected={activeTab === tab.key} className={activeTab === tab.key ? 'overview-tab active' : 'overview-tab'} onClick={() => setActiveTab(tab.key)}><Icon size={16} /> {t[tab.key]}</button> })}
      </div>

      {activeTab === 'spending' && <div className="tab-panel">
        <section className="summary-grid" aria-label={t.spending}>
          <article className="summary-card"><div className="summary-label">{t.expenses}<span className="summary-symbol expense-symbol"><ArrowUpRight size={16} /></span></div><div className="summary-amount">{formatCurrency(totals.expense, language)}</div><div className="summary-foot"><Delta value={expenseDelta} invert /> {t.vsLastMonth}</div></article>
          <article className="summary-card"><div className="summary-label">{t.topCategory}</div><div className="summary-amount">{topSpendingName ? (t.categoryNames[topSpendingName[0]] || topSpendingName[0]) : '—'}</div><div className="summary-foot">{topSpendingName ? formatCurrency(topSpendingName[1], language) : t.emptySpending}</div></article>
        </section>
        <section className="insights-grid"><article className="panel spending-panel"><div className="panel-heading"><div><h2>{t.whereItGoes}</h2><p>{t.spendingBreakdown}</p></div><span className="panel-icon"><ArrowUpRight size={18} /></span></div><SpendingBreakdown transactions={monthlyTransactions} /></article><article className="panel cashflow-panel"><div className="panel-heading"><div><h2>{t.cashFlow}</h2><p>{t.byWeek}</p></div><span className="panel-icon"><TrendingUp size={17} /></span></div><CashFlowChart transactions={monthlyTransactions} selectedMonth={selectedMonth} /></article></section>
      </div>}

      {activeTab === 'earning' && <div className="tab-panel">
        <section className="summary-grid" aria-label={t.earning}>
          <article className="summary-card"><div className="summary-label">{t.income}<span className="summary-symbol income-symbol"><ArrowDownLeft size={16} /></span></div><div className="summary-amount">{formatCurrency(totals.income, language)}</div><div className="summary-foot"><Delta value={incomeDelta} /> {t.vsLastMonth}</div></article>
          <article className="summary-card"><div className="summary-label">{t.mainSource}</div><div className="summary-amount">{topIncomeName ? (t.categoryNames[topIncomeName[0]] || topIncomeName[0]) : '—'}</div><div className="summary-foot">{topIncomeName ? formatCurrency(topIncomeName[1], language) : t.emptyIncome}</div></article>
        </section>
        <section className="insights-grid"><article className="panel spending-panel"><div className="panel-heading"><div><h2>{t.incomeBySource}</h2><p>{t.spendingBreakdown}</p></div><span className="panel-icon"><ArrowDownLeft size={18} /></span></div><IncomeBreakdown transactions={monthlyTransactions} /></article><article className="panel cashflow-panel"><div className="panel-heading"><div><h2>{t.incomeTrend}</h2><p>{t.incomeTrendSubtitle}</p></div><span className="panel-icon"><TrendingUp size={17} /></span></div><IncomeTrendChart transactions={transactions} /></article></section>
      </div>}

      {activeTab === 'investing' && <div className="tab-panel">
        <section className="global-position-panel" aria-label={t.globalPosition}>
          <div className="global-position-feature"><span className="global-position-icon"><ChartLine size={18} /></span><p className="global-position-label">{t.globalPosition}</p><strong>{formatCurrency(globalPosition, language)}</strong><span className="global-position-caption">{t.globalPositionSubtitle}</span></div>
          <div className="global-position-details"><div className="global-breakdown"><div><span>{t.trackedCash}</span><strong className={trackedCash < 0 ? 'negative-return' : ''}>{formatCurrency(trackedCash, language)}</strong></div><div><span>{t.globalETFValue}</span><strong>{formatCurrency(totalPortfolioValue, language)}</strong></div><button className="text-button" onClick={() => onSelectPortfolioPage('etfs')}><ChartLine size={15} /> {t.viewInvestments}<ArrowRight size={14} /></button></div><p className="global-position-note">{t.globalPositionNote}</p></div>
        </section>

        {hasVisibleInvestments && <section className="portfolio-overview"><div className="overview-section-heading"><h2>{t.portfolioSummary}</h2><p>{t.portfolioSummarySubtitle}</p></div><div className="portfolio-mini-grid">
          {[
            { page: 'etfs', label: t.etfs, value: ETFMarketValue, invested: ETFInvested, count: records.etfs.length, icon: <ChartLine size={16} />, tint: 'etf-tint' },
            { page: 'crypto', label: t.crypto, value: cryptoMarketValue, invested: cryptoInvested, count: records.crypto.length, icon: <Wallet size={16} />, tint: 'crypto-tint' },
            { page: 'p2p', label: t.p2p, value: p2pMarketValue, invested: p2pInvested, count: records.p2p.length, icon: <ArrowDownLeft size={16} />, tint: 'p2p-tint' },
            { page: 'bonds', label: t.bonds, value: bondsMarketValue, invested: bondsInvested, count: records.bonds.length, icon: <ChartLine size={16} />, tint: 'bonds-tint' },
            { page: 'savings', label: t.savings, value: totalSavingsBalance, invested: totalSavingsBalance, count: records.savings.length, icon: <Wallet size={16} />, tint: 'savings-tint', detail: t.currentBalance },
          ].filter((item) => investmentVisibility[item.page]).map((item) => <button className="portfolio-mini-card" key={item.page} onClick={() => onSelectPortfolioPage(item.page)}><span className={`portfolio-mini-icon ${item.tint}`}>{item.icon}</span><span className="portfolio-mini-title">{item.label}<ArrowRight size={13} /></span><strong>{formatCurrency(item.value, language)}</strong><span className="portfolio-mini-foot">{item.count} {t.items} · {formatCurrency(item.invested, language)} {item.detail || t.invested}</span></button>)}
        </div></section>}

        <section className="panel position-evolution-panel"><div className="position-evolution-heading"><div className="panel-heading"><div><h2>{t.assetEvolution}</h2><p>{t.assetEvolutionSubtitle}</p></div><span className="panel-icon"><TrendingUp size={17} /></span></div><div className="range-switch" role="group" aria-label={t.assetEvolution}>{ranges.map(([value, label]) => <button key={value} className={range === value ? 'range-option active-range' : 'range-option'} aria-pressed={range === value} onClick={() => setRange(value)}>{label}</button>)}</div></div><PositionEvolutionChart timeline={timeline} range={range} visibility={investmentVisibility} /></section>
      </div>}

      {fireMeterVisible && fire.target > 0 && <div className="fire-compact-mobile"><FireMeterCompact position={globalPosition} goal={fire.target} /></div>}

      <section className="panel transactions-panel" id="transactions"><div className="transactions-heading"><div><h2>{t.recentActivity}</h2><p>{t.moneyComingGoing}</p></div><div className="transactions-heading-actions"><button className="text-button" onClick={onAddTransaction}><Plus size={15} /> {t.addNew}</button><button className="view-all-button" onClick={() => onSelectPortfolioPage('transactions')}>{t.viewAll} <ArrowRight size={14} /></button></div></div>
        <div className="transaction-table"><div className="table-head"><span>{t.transaction}</span><span>{t.category}</span><span>{t.platform}</span><span>{t.date.toUpperCase()}</span><span>{t.amount}</span><span /></div>
          {recentTransactions.length ? recentTransactions.map((item) => { const info = categoryInfo(item.category, item.type); const typeLabel = item.type === 'income' ? t.income.charAt(0) + t.income.slice(1).toLowerCase() : t.expense; return <div className="transaction-row" key={item.id}><div className="transaction-main"><IconBadge icon={info.icon} color={info.color} /><div className="transaction-title"><button className="transaction-edit-trigger" onClick={() => onEditTransaction(item)} aria-label={`${t.edit} ${item.title}`}>{item.title}</button><span>{typeLabel}{item.isDemo && <i className="sample-chip">{t.sampleData}</i>}</span><span className="transaction-platform-mobile">{item.platform || t.noPlatform}</span></div></div><span className="category-pill"><i style={{ background: info.color }} />{t.categoryNames[item.category] || item.category}</span><span className="platform-pill">{item.platform || t.noPlatform}</span><span className="transaction-date">{formatDateTime(item.date, locale)}</span><span className={`transaction-amount ${item.type}`}>{item.type === 'income' ? '+' : '−'}{formatCurrency(item.amount, language)}</span><div className="transaction-actions"><button className="edit-row" onClick={() => onEditTransaction(item)} aria-label={`${t.edit} ${item.title}`} title={t.edit}><Pencil size={15} /></button><button className="delete-row" onClick={() => onDeleteTransaction(item.id)} aria-label={`${t.delete} ${item.title}`} title={t.delete}><X size={15} /></button></div></div> }) : <div className="empty-transactions"><span className="empty-icon"><Coffee size={21} /></span><strong>{t.freshStart}</strong><p>{t.firstTransaction}</p><button className="text-button" onClick={onAddTransaction}><Plus size={15} /> {t.addATransaction}</button></div>}
        </div>
        {recentTransactions.length > 0 && <div className="table-footer"><span>{t.showing} <strong>{recentTransactions.length}</strong> {t.of} <strong>{monthlyTransactions.length}</strong> {t.transactions.toLowerCase()}</span><span className="footer-note"><Check size={13} /> {t.lookingGood}</span></div>}
      </section>

      <footer className="page-footer"><span>{t.footer}</span><span>{t.footerMonth} <span className="footer-heart">♥</span></span></footer>
    </div>
  )
}
