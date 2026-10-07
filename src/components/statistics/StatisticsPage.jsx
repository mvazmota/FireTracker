import AnnualCategoryBreakdown from '../charts/AnnualCategoryBreakdown.jsx'
import AnnualFlowChart from '../charts/AnnualFlowChart.jsx'
import { useMemo, useState } from 'react'
import { ArrowDownLeft, ArrowLeft, ArrowRight, ArrowUpRight, CalendarDays, ChartLine, Plus, Sparkles, Wallet } from 'lucide-react'
import { formatCurrency } from '../../lib/format.js'
import { demoTransactionsForEmptyMonths } from '../../lib/simulation.js'
import { useI18n } from '../../i18n/LanguageProvider.jsx'
export default function StatisticsPage({ transactions, onFillSample }) {
  const { t, locale, language } = useI18n()
  const [year, setYear] = useState(() => new Date().getFullYear())
  const yearTransactions = useMemo(() => transactions.filter((item) => Number(item.date.slice(0, 4)) === year), [transactions, year])
  const totals = useMemo(() => yearTransactions.reduce((result, item) => { result[item.type] += item.amount; return result }, { income: 0, expense: 0 }), [yearTransactions])
  const net = totals.income - totals.expense
  const yearlyInvested = yearTransactions.filter((item) => item.type === 'expense' && ['Investment', 'Investments'].includes(item.category)).reduce((sum, item) => sum + item.amount, 0)
  const yearlySavingsDeposits = yearTransactions.filter((item) => item.type === 'expense' && item.category === 'Savings').reduce((sum, item) => sum + item.amount, 0)
  const yearlyCashSaved = net + yearlySavingsDeposits
  const savingRate = totals.income ? ((yearlyCashSaved + yearlyInvested) / totals.income) * 100 : 0
  const missingSamples = demoTransactionsForEmptyMonths(transactions).length

  return <div className="page-content statistics-page">
    <section className="welcome-row"><div><p className="eyebrow">{t.statsEyebrow}</p><h1>{t.statsHeading}<span>.</span></h1><p className="welcome-sub">{t.statsSubtitle}</p></div><button className="sample-history-button" onClick={onFillSample} disabled={!missingSamples} title={t.sampleInfo}><Plus size={15} /> {t.sampleHistory}</button></section>
    <div className="year-toolbar"><div className="month-nav"><button className="month-arrow" onClick={() => setYear((value) => value - 1)} aria-label={t.previousYear}><ArrowLeft size={17} /></button><div className="month-heading"><CalendarDays size={17} /><strong>{year}</strong></div><button className="month-arrow" onClick={() => setYear((value) => value + 1)} aria-label={t.nextYear}><ArrowRight size={17} /></button></div><button className="today-button" onClick={() => setYear(new Date().getFullYear())}>{t.thisYear}</button></div>
    <section className="summary-grid annual-summary" aria-label={`${t.yearSummary} ${year}`}>
      <article className="summary-card"><div className="summary-label">{t.yearlyIncome}<span className="summary-symbol income-symbol"><ArrowDownLeft size={16} /></span></div><div className="summary-amount">{formatCurrency(totals.income, language)}</div><div className="summary-foot"><span className="mini-dot income-mini" />{year}</div><div className="card-progress"><span className="income-progress" style={{ width: `${totals.income ? Math.min(100, (totals.income / Math.max(totals.income, totals.expense)) * 100) : 0}%` }} /></div></article>
      <article className="summary-card"><div className="summary-label">{t.yearlyExpenses}<span className="summary-symbol expense-symbol"><ArrowUpRight size={16} /></span></div><div className="summary-amount">{formatCurrency(totals.expense, language)}</div><div className="summary-foot"><span className="mini-dot expense-mini" />{year}</div><div className="card-progress"><span className="expense-progress" style={{ width: `${totals.expense ? Math.min(100, (totals.expense / Math.max(totals.income, totals.expense)) * 100) : 0}%` }} /></div></article>
      <article className="summary-card balance-card"><div className="summary-label">{t.yearlyBalance}<span className="summary-symbol"><Wallet size={16} /></span></div><div className="summary-amount">{formatCurrency(net, language)}</div><div className="summary-foot">{net >= 0 ? t.keepGoing : t.overBudget}</div><div className="balance-art"><span /><span /><span /></div></article>
      <article className="summary-card"><div className="summary-label">{t.yearlySavings}<span className="summary-symbol savings-symbol"><Sparkles size={15} /></span></div><div className="summary-amount">{savingRate.toFixed(0)}<span className="percent">%</span></div><div className="summary-foot savings-breakdown-foot"><span>{t.cashSavedBreakdown}: {formatCurrency(yearlyCashSaved, language)}</span><span>{t.investedBreakdown}: {formatCurrency(yearlyInvested, language)}</span></div><div className="card-progress"><span className="savings-progress" style={{ width: `${Math.max(0, Math.min(100, savingRate))}%` }} /></div></article>
    </section>
    <section className="insights-grid annual-insights"><article className="panel annual-flow-panel"><div className="panel-heading"><div><h2>{t.annualFlow}</h2><p>{t.annualFlowSubtitle}</p></div><span className="panel-icon"><ChartLine size={17} /></span></div><AnnualFlowChart transactions={yearTransactions} year={year} /></article><AnnualCategoryBreakdown transactions={yearTransactions} year={year} /></section>
    <div className="sample-data-note"><Sparkles size={14} /><span>{t.sampleInfo}</span></div>
    <footer className="page-footer"><span>{t.footer}</span><span>{t.footerMonth} <span className="footer-heart">♥</span></span></footer>
  </div>
}
