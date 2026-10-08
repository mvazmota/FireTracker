import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDownLeft, ArrowLeft, ArrowRight, ArrowUpRight, Bitcoin, CalendarDays, Camera, ChartLine,
  Check, ChevronDown, CircleHelp, Clock, Coffee, CreditCard, Ellipsis, Flame, HandCoins, Landmark,
  Film, ForkKnife, Gift, HeartPulse, House, Pencil, Plus, Search, ShoppingBag,
  LogOut, ReceiptText, Repeat, SlidersHorizontal, Sparkles, Tag, TrendingUp, UserRound, Wallet, X,
} from 'lucide-react'

import AppProviders from './app/AppProviders.jsx'
import { useI18n } from './i18n/LanguageProvider.jsx'
import { useAuth } from './context/AuthProvider.jsx'
import { useData } from './context/DataProvider.jsx'
import { useSync } from './context/SyncProvider.jsx'
import { useSettings } from './context/SettingsProvider.jsx'
import { useFinance } from './context/FinanceProvider.jsx'
import { usePortfolioSummary } from './hooks/usePortfolioSummary.js'
import { useFireProjection } from './hooks/useFireProjection.js'
// Only needed before the app is usable, so they are kept out of the main chunk.
const LoginPage = lazy(() => import('./components/auth/LoginPage.jsx'))
const OnboardingPage = lazy(() => import('./components/onboarding/OnboardingPage.jsx'))
const ResetPasswordPage = lazy(() => import('./components/auth/ResetPasswordPage.jsx'))
import { dateForMonth, formatDateTime } from './lib/dates.js'
import { formatCurrency } from './lib/format.js'
import { categoryInfo } from './data/categories.js'
import { messages } from './i18n/messages.jsx'


























function AppShell() {
  const { language, locale, t, changeLanguage } = useI18n()
  const { user, isPending, signOut } = useAuth()
  const { error: dataError, reload: reloadData } = useData()
  const { status: syncStatus, retry: retrySync } = useSync()
  const {
    profile,
    fireMeterVisible,
    investmentVisibility,
    onboarded,
    hydrated: settingsReady,
  } = useSettings()
  const {
    transactions,
    holdings,
    cryptoHoldings,
    p2pRecords,
    bondHoldings,
    savingsAccounts,
    saveTransaction,
    removeTransaction,
    savePortfolioRecord,
    removePortfolioRecord,
    saveSavingsAccount,
    saveSavingsAccounts,
    fillSampleHistory,
    hydrated: financeReady,
  } = useFinance()

  const [selectedMonth, setSelectedMonth] = useState(() => dateForMonth(new Date()))
  const [activePage, setActivePage] = useState('overview')
  const [activeMobileTab, setActiveMobileTab] = useState('overview')
  const [showModal, setShowModal] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState(null)

  const summary = usePortfolioSummary(selectedMonth)
  const {
    monthlyTransactions,
    recentTransactions,
    totals,
    net,
    monthlyInvested,
    cashSavedThisMonth,
    savingsRate,
    trackedCash,
    globalPosition,
    totalPortfolioValue,
    values,
  } = summary

  // The goal comes from the plan, so the meter and the FIRE tab always agree.
  const fire = useFireProjection(globalPosition)

  // Aliases so the markup below reads the same as before.
  const savings = savingsRate
  const ETFInvested = values.etfs.invested
  const ETFMarketValue = values.etfs.value
  const cryptoInvested = values.crypto.invested
  const cryptoMarketValue = values.crypto.value
  const p2pInvested = values.p2p.invested
  const p2pMarketValue = values.p2p.value
  const bondsInvested = values.bonds.invested
  const bondsMarketValue = values.bonds.value
  const totalSavingsBalance = values.savings.value
  const hasVisibleInvestments = Object.values(investmentVisibility).some(Boolean)

  const monthTitle = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(selectedMonth)
  const today = new Date()

  useEffect(() => {
    document.documentElement.lang = locale
    document.title = language === 'pt' ? 'Firepath — o teu caminho para a independência financeira' : 'Firepath — your path to financial independence'
  }, [language, locale])

  function closeModal() {
    setShowModal(false)
    setEditingTransaction(null)
  }

  function handleSaveTransaction(transaction) {
    saveTransaction(transaction)
    closeModal()
  }

  function shiftMonth(amount) {
    setSelectedMonth((month) => new Date(month.getFullYear(), month.getMonth() + amount, 1))
  }

  function selectOverview() {
    setActivePage('overview')
    setActiveMobileTab('overview')
  }

  function selectGlobalPosition() {
    setActivePage('position')
    setActiveMobileTab('position')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function selectProfilePage() {
    setActivePage('profile')
    setActiveMobileTab('profile')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function selectPortfolioPage(page) {
    setActivePage(page)
    setActiveMobileTab(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function selectStatistics() {
    setActivePage('statistics')
    setActiveMobileTab('statistics')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function selectTransactions(event) {
    event?.preventDefault()
    setActivePage('transactions')
    setActiveMobileTab('transactions')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // The reset email links to /reset-password, which the Worker serves as the SPA.
  if (window.location.pathname.startsWith('/reset-password')) return <Suspense fallback={<div className="app-loading">{t.loading}</div>}><ResetPasswordPage /></Suspense>
  if (isPending) return <div className="app-loading">{t.loading}</div>
  if (!user) return <Suspense fallback={<div className="app-loading">{t.loading}</div>}><LoginPage /></Suspense>
  if (dataError) return <div className="app-loading"><div className="load-error"><p>{t.loadError}</p><button type="button" className="ghost-button" onClick={reloadData}>{t.retry}</button></div></div>
  if (!settingsReady || !financeReady) return <div className="app-loading">{t.loading}</div>
  if (!onboarded) return <Suspense fallback={<div className="app-loading">{t.loading}</div>}><OnboardingPage /></Suspense>

  return (
    <div className="app-shell" lang={locale}>
      <aside className="sidebar" data-space-label={language === 'pt' ? 'AS TUAS FINANÇAS' : 'YOUR MONEY'}>
        <a className="brand" href="#overview" aria-label="Firepath home"><span className="brand-mark"><Flame size={18} fill="currentColor" /></span><span>firepath<span className="brand-period">.</span></span></a>
        <div className="side-caption">{t.yourSpace.toUpperCase()}</div>
        <a className={activePage === 'overview' ? 'nav-link active' : 'nav-link'} href="#overview" onClick={(event) => { event.preventDefault(); selectOverview() }}><span className="nav-icon"><Wallet size={18} /></span>{t.overview}</a>
        <a className={activePage === 'position' ? 'nav-link active' : 'nav-link'} href="#position" onClick={(event) => { event.preventDefault(); selectGlobalPosition() }}><span className="nav-icon"><ChartLine size={18} /></span>{t.position}</a>
        <a className={activePage === 'fire' ? 'nav-link active' : 'nav-link'} href="#fire" onClick={(event) => { event.preventDefault(); selectPortfolioPage('fire') }}><span className="nav-icon"><Flame size={18} /></span>{t.fire}</a>
        <a className={activePage === 'transactions' ? 'nav-link active' : 'nav-link'} href="#all-transactions" onClick={selectTransactions}><span className="nav-icon"><ReceiptText size={18} /></span>{t.transactions}</a>
        <a className={activePage === 'recurring' ? 'nav-link active' : 'nav-link'} href="#recurring" onClick={(event) => { event.preventDefault(); selectPortfolioPage('recurring') }}><span className="nav-icon"><Repeat size={18} /></span>{t.recurring}</a>
        {investmentVisibility.etfs && <a className={activePage === 'etfs' ? 'nav-link active' : 'nav-link'} href="#etfs" onClick={(event) => { event.preventDefault(); selectPortfolioPage('etfs') }}><span className="nav-icon"><ChartLine size={18} /></span>{t.etfs}</a>}
        {investmentVisibility.crypto && <a className={activePage === 'crypto' ? 'nav-link active' : 'nav-link'} href="#crypto" onClick={(event) => { event.preventDefault(); selectPortfolioPage('crypto') }}><span className="nav-icon"><Bitcoin size={18} /></span>{t.crypto}</a>}
        {investmentVisibility.p2p && <a className={activePage === 'p2p' ? 'nav-link active' : 'nav-link'} href="#p2p" onClick={(event) => { event.preventDefault(); selectPortfolioPage('p2p') }}><span className="nav-icon"><HandCoins size={18} /></span>{t.p2p}</a>}
        {investmentVisibility.bonds && <a className={activePage === 'bonds' ? 'nav-link active' : 'nav-link'} href="#bonds" onClick={(event) => { event.preventDefault(); selectPortfolioPage('bonds') }}><span className="nav-icon"><Landmark size={18} /></span>{t.bonds}</a>}
        {investmentVisibility.savings && <a className={activePage === 'savings' ? 'nav-link active' : 'nav-link'} href="#savings" onClick={(event) => { event.preventDefault(); selectPortfolioPage('savings') }}><span className="nav-icon"><Wallet size={18} /></span>{t.savings}</a>}
        <a className={activePage === 'statistics' ? 'nav-link active' : 'nav-link'} href="#statistics" onClick={(event) => { event.preventDefault(); selectStatistics() }}><span className="nav-icon"><CalendarDays size={18} /></span>{t.statistics}</a>
        <div className="sidebar-bottom">{fireMeterVisible && fire.target > 0 && <FireMeterCompact position={globalPosition} goal={fire.target} />}<button className="help-link" type="button"><CircleHelp size={17} /> {t.help}</button><div className="profile"><button className={activePage === 'profile' ? 'profile-button active-profile' : 'profile-button'} type="button" onClick={selectProfilePage}><Avatar profile={profile} /><div className="profile-meta"><strong>{profile.name || t.account}</strong><span>{t.profile}</span></div><Ellipsis size={18} className="profile-more" /></button></div></div>
      </aside>

      <nav className="mobile-nav" aria-label={t.yourSpace}>
        <button className={activeMobileTab === 'overview' ? 'mobile-nav-link active-mobile-nav' : 'mobile-nav-link'} onClick={selectOverview}><Wallet size={15} />{t.overview}</button>
        <button className={activeMobileTab === 'position' ? 'mobile-nav-link active-mobile-nav' : 'mobile-nav-link'} onClick={selectGlobalPosition}><ChartLine size={15} />{t.position}</button>
        <button className={activeMobileTab === 'fire' ? 'mobile-nav-link active-mobile-nav' : 'mobile-nav-link'} onClick={() => selectPortfolioPage('fire')}><Flame size={15} />{t.fire}</button>
        <button className={activeMobileTab === 'transactions' ? 'mobile-nav-link active-mobile-nav' : 'mobile-nav-link'} onClick={selectTransactions}><ReceiptText size={15} />{t.transactions}</button>
        <button className={activeMobileTab === 'recurring' ? 'mobile-nav-link active-mobile-nav' : 'mobile-nav-link'} onClick={() => selectPortfolioPage('recurring')}><Repeat size={15} />{t.recurring}</button>
        {investmentVisibility.etfs && <button className={activeMobileTab === 'etfs' ? 'mobile-nav-link active-mobile-nav' : 'mobile-nav-link'} onClick={() => selectPortfolioPage('etfs')}><ChartLine size={15} />{t.etfs}</button>}
        {investmentVisibility.crypto && <button className={activeMobileTab === 'crypto' ? 'mobile-nav-link active-mobile-nav' : 'mobile-nav-link'} onClick={() => selectPortfolioPage('crypto')}><Bitcoin size={15} />{t.crypto}</button>}
        {investmentVisibility.p2p && <button className={activeMobileTab === 'p2p' ? 'mobile-nav-link active-mobile-nav' : 'mobile-nav-link'} onClick={() => selectPortfolioPage('p2p')}><HandCoins size={15} />{t.p2p}</button>}
        {investmentVisibility.bonds && <button className={activeMobileTab === 'bonds' ? 'mobile-nav-link active-mobile-nav' : 'mobile-nav-link'} onClick={() => selectPortfolioPage('bonds')}><Landmark size={15} />{t.bonds}</button>}
        {investmentVisibility.savings && <button className={activeMobileTab === 'savings' ? 'mobile-nav-link active-mobile-nav' : 'mobile-nav-link'} onClick={() => selectPortfolioPage('savings')}><Wallet size={15} />{t.savings}</button>}
        <button className={activeMobileTab === 'profile' ? 'mobile-nav-link active-mobile-nav' : 'mobile-nav-link'} onClick={selectProfilePage}><UserRound size={15} />{t.profile}</button>
        <button className={activeMobileTab === 'statistics' ? 'mobile-nav-link active-mobile-nav' : 'mobile-nav-link'} onClick={selectStatistics}><CalendarDays size={15} />{t.statistics}</button>
      </nav>

      <main className="main-content" id="overview">
        <header className="topbar"><div className="breadcrumb">{t.yourSpace} <span>/</span> <strong>{t[activePage] || t.overview}</strong></div><div className="topbar-right"><div className="language-switch" role="group" aria-label={t.language}><button type="button" className={language === 'en' ? 'language-option selected-language' : 'language-option'} aria-label="English" aria-pressed={language === 'en'} onClick={() => changeLanguage('en')}>EN</button><button type="button" className={language === 'pt' ? 'language-option selected-language' : 'language-option'} aria-label="Português (Portugal)" title="Português (Portugal)" aria-pressed={language === 'pt'} onClick={() => changeLanguage('pt')}>PT</button></div><span className={syncStatus === 'error' ? 'today-label sync-failed' : 'today-label'}><span className="online-dot" />{syncStatus === 'error' ? t.saveFailed : syncStatus === 'saving' ? t.saving : t.saved}</span>{syncStatus === 'error' && <button className="sync-retry" type="button" onClick={retrySync}>{t.retry}</button>}<button type="button" className="top-avatar-button" onClick={selectProfilePage} title={t.profile} aria-label={t.profile}><Avatar profile={profile} className="top-avatar" /></button><button className="logout-button" type="button" onClick={() => signOut()} title={t.logout} aria-label={t.logout}><LogOut size={14} /><span>{t.logout}</span></button></div></header>
        {activePage === 'profile' ? <ProfilePage /> : activePage === 'position' ? <GlobalPositionPage transactions={transactions} records={{ etfs: investmentVisibility.etfs ? holdings : [], crypto: investmentVisibility.crypto ? cryptoHoldings : [], p2p: investmentVisibility.p2p ? p2pRecords : [], bonds: investmentVisibility.bonds ? bondHoldings : [], savings: investmentVisibility.savings ? savingsAccounts : [] }} visibility={investmentVisibility} currentPosition={globalPosition} currentCash={trackedCash} /> : activePage === 'fire' ? <FirePage /> : activePage === 'transactions' ? <AllTransactionsPage transactions={transactions} onAdd={() => setShowModal(true)} onEdit={setEditingTransaction} onDelete={removeTransaction} /> : activePage === 'recurring' ? <RecurringPage /> : activePage === 'etfs' || activePage === 'crypto' ? <InvestmentsPage holdings={activePage === 'etfs' ? holdings : cryptoHoldings} assetType={activePage === 'etfs' ? 'etf' : 'crypto'} onSave={(record, captureCurrent) => savePortfolioRecord(activePage, record, captureCurrent)} onDelete={(id) => removePortfolioRecord(activePage, id)} /> : activePage === 'p2p' || activePage === 'bonds' ? <FixedIncomePage kind={activePage} records={activePage === 'p2p' ? p2pRecords : bondHoldings} onSave={(record, captureCurrent) => savePortfolioRecord(activePage, record, captureCurrent)} onDelete={(id) => removePortfolioRecord(activePage, id)} /> : activePage === 'savings' ? <SavingsPage accounts={savingsAccounts} onSave={saveSavingsAccount} onDelete={(account) => saveSavingsAccounts(savingsAccounts.filter((item) => item.id !== account.id))} /> : activePage === 'statistics' ? <StatisticsPage transactions={transactions} onFillSample={fillSampleHistory} /> : <div className="page-content">
          <section className="welcome-row"><div><p className="eyebrow">{t.snapshot}</p><h1>{t.headline}<span>.</span></h1><p className="welcome-sub">{t.welcome}</p></div><button className="primary-button" onClick={() => setShowModal(true)}><Plus size={18} strokeWidth={2.4} /> {t.addTransaction}</button></section>

          <section className="global-position-panel" aria-label={t.globalPosition}>
            <div className="global-position-feature"><span className="global-position-icon"><ChartLine size={18} /></span><p className="global-position-label">{t.globalPosition}</p><strong>{formatCurrency(globalPosition, language)}</strong><span className="global-position-caption">{t.globalPositionSubtitle}</span></div>
            <div className="global-position-details"><div className="global-breakdown"><div><span>{t.trackedCash}</span><strong className={trackedCash < 0 ? 'negative-return' : ''}>{formatCurrency(trackedCash, language)}</strong></div><div><span>{t.globalETFValue}</span><strong>{formatCurrency(totalPortfolioValue, language)}</strong></div><button className="text-button" onClick={() => selectPortfolioPage('etfs')}><ChartLine size={15} /> {t.viewInvestments}<ArrowRight size={14} /></button></div><p className="global-position-note">{t.globalPositionNote}</p></div>
          </section>

          {fireMeterVisible && fire.target > 0 && <div className="fire-compact-mobile"><FireMeterCompact position={globalPosition} goal={fire.target} /></div>}

          {hasVisibleInvestments && <section className="portfolio-overview"><div className="overview-section-heading"><h2>{t.portfolioSummary}</h2><p>{t.portfolioSummarySubtitle}</p></div><div className="portfolio-mini-grid">
            {[
              { page: 'etfs', label: t.etfs, value: ETFMarketValue, invested: ETFInvested, count: holdings.length, icon: <ChartLine size={16} />, tint: 'etf-tint' },
              { page: 'crypto', label: t.crypto, value: cryptoMarketValue, invested: cryptoInvested, count: cryptoHoldings.length, icon: <Bitcoin size={16} />, tint: 'crypto-tint' },
              { page: 'p2p', label: t.p2p, value: p2pMarketValue, invested: p2pInvested, count: p2pRecords.length, icon: <HandCoins size={16} />, tint: 'p2p-tint' },
              { page: 'bonds', label: t.bonds, value: bondsMarketValue, invested: bondsInvested, count: bondHoldings.length, icon: <Landmark size={16} />, tint: 'bonds-tint' },
              { page: 'savings', label: t.savings, value: totalSavingsBalance, invested: totalSavingsBalance, count: savingsAccounts.length, icon: <Wallet size={16} />, tint: 'savings-tint', detail: t.currentBalance },
            ].filter((item) => investmentVisibility[item.page]).map((item) => <button className="portfolio-mini-card" key={item.page} onClick={() => selectPortfolioPage(item.page)}><span className={`portfolio-mini-icon ${item.tint}`}>{item.icon}</span><span className="portfolio-mini-title">{item.label}<ArrowRight size={13} /></span><strong>{formatCurrency(item.value, language)}</strong><span className="portfolio-mini-foot">{item.count} {t.items} · {formatCurrency(item.invested, language)} {item.detail || t.invested}</span></button>)}
          </div></section>}

          <section className="month-toolbar" aria-label={t.selectMonth}><div className="month-nav"><button className="month-arrow" onClick={() => shiftMonth(-1)} aria-label={t.previousMonth}><ArrowLeft size={17} /></button><div className="month-heading"><CalendarDays size={17} /><strong>{monthTitle}</strong></div><button className="month-arrow" onClick={() => shiftMonth(1)} aria-label={t.nextMonth}><ArrowRight size={17} /></button></div><button className="today-button" onClick={() => setSelectedMonth(dateForMonth(today))}>{t.today}</button></section>

          <section className="summary-grid" aria-label={t.monthlySummary}>
            <article className="summary-card balance-card"><div className="summary-label">{t.balance}<span className="summary-symbol"><Wallet size={16} /></span></div><div className="summary-amount">{formatCurrency(cashSavedThisMonth, language)}</div><div className="summary-foot"><span className="trend-chip"><TrendingUp size={13} /> {savings.toFixed(0)}%</span><span>{t.cashSavedCaption}</span></div><div className="balance-art"><span /><span /><span /></div></article>
            <article className="summary-card"><div className="summary-label">{t.income}<span className="summary-symbol income-symbol"><ArrowDownLeft size={16} /></span></div><div className="summary-amount">{formatCurrency(totals.income, language)}</div><div className="summary-foot"><span className="mini-dot income-mini" />{t.moneyIn}</div><div className="card-progress"><span className="income-progress" style={{ width: `${totals.income ? Math.min(100, (totals.income / Math.max(totals.income, totals.expense)) * 100) : 0}%` }} /></div></article>
            <article className="summary-card"><div className="summary-label">{t.expenses}<span className="summary-symbol expense-symbol"><ArrowUpRight size={16} /></span></div><div className="summary-amount">{formatCurrency(totals.expense, language)}</div><div className="summary-foot"><span className="mini-dot expense-mini" />{t.moneyOut}</div><div className="card-progress"><span className="expense-progress" style={{ width: `${totals.expense ? Math.min(100, (totals.expense / Math.max(totals.income, totals.expense)) * 100) : 0}%` }} /></div></article>
            <article className="summary-card"><div className="summary-label">{t.savingRate}<span className="summary-symbol savings-symbol"><Sparkles size={15} /></span></div><div className="summary-amount">{savings.toFixed(0)}<span className="percent">%</span></div><div className="summary-foot savings-breakdown-foot"><span>{t.cashSavedBreakdown}: {formatCurrency(cashSavedThisMonth, language)}</span><span>{t.investedBreakdown}: {formatCurrency(monthlyInvested, language)}</span></div><div className="card-progress"><span className="savings-progress" style={{ width: `${Math.max(0, Math.min(100, savings))}%` }} /></div></article>
          </section>

          <section className="insights-grid"><article className="panel cashflow-panel"><div className="panel-heading"><div><h2>{t.cashFlow}</h2><p>{t.byWeek}</p></div><span className="panel-icon"><TrendingUp size={17} /></span></div><CashFlowChart transactions={monthlyTransactions} selectedMonth={selectedMonth} /></article><article className="panel spending-panel"><div className="panel-heading"><div><h2>{t.whereItGoes}</h2><p>{t.spendingBreakdown}</p></div><span className="panel-icon"><Ellipsis size={18} /></span></div><SpendingBreakdown transactions={monthlyTransactions} /></article></section>

          <section className="panel transactions-panel" id="transactions"><div className="transactions-heading"><div><h2>{t.recent}</h2><p>{t.moneyComingGoing}</p></div><div className="transactions-heading-actions"><button className="text-button" onClick={() => setShowModal(true)}><Plus size={15} /> {t.addNew}</button><button className="view-all-button" onClick={selectTransactions}>{t.viewAll} <ArrowRight size={14} /></button></div></div>
            <div className="transaction-table"><div className="table-head"><span>{t.transaction}</span><span>{t.category}</span><span>{t.platform}</span><span>{t.date.toUpperCase()}</span><span>{t.amount}</span><span /></div>
              {recentTransactions.length ? recentTransactions.map((item) => { const info = categoryInfo(item.category, item.type); const typeLabel = item.type === 'income' ? t.income.charAt(0) + t.income.slice(1).toLowerCase() : t.expense; return <div className="transaction-row" key={item.id}><div className="transaction-main"><IconBadge icon={info.icon} color={info.color} /><div className="transaction-title"><button className="transaction-edit-trigger" onClick={() => setEditingTransaction(item)} aria-label={`${t.edit} ${item.title}`}>{item.title}</button><span>{typeLabel}{item.isDemo && <i className="sample-chip">{t.sampleData}</i>}</span><span className="transaction-platform-mobile">{item.platform || t.noPlatform}</span></div></div><span className="category-pill"><i style={{ background: info.color }} />{t.categoryNames[item.category] || item.category}</span><span className="platform-pill">{item.platform || t.noPlatform}</span><span className="transaction-date">{formatDateTime(item.date, locale)}</span><span className={`transaction-amount ${item.type}`}>{item.type === 'income' ? '+' : '−'}{formatCurrency(item.amount, language)}</span><div className="transaction-actions"><button className="edit-row" onClick={() => setEditingTransaction(item)} aria-label={`${t.edit} ${item.title}`} title={t.edit}><Pencil size={15} /></button><button className="delete-row" onClick={() => removeTransaction(item.id)} aria-label={`${t.delete} ${item.title}`} title={t.delete}><X size={15} /></button></div></div> }) : <div className="empty-transactions"><span className="empty-icon"><Coffee size={21} /></span><strong>{t.freshStart}</strong><p>{t.firstTransaction}</p><button className="text-button" onClick={() => setShowModal(true)}><Plus size={15} /> {t.addATransaction}</button></div>}
            </div>
            {recentTransactions.length > 0 && <div className="table-footer"><span>{t.showing} <strong>{recentTransactions.length}</strong> {t.of} <strong>{monthlyTransactions.length}</strong> {t.transactions.toLowerCase()}</span><span className="footer-note"><Check size={13} /> {t.lookingGood}</span></div>}
          </section>
          <footer className="page-footer"><span>{t.footer}</span><span>{t.footerMonth} <span className="footer-heart">♥</span></span></footer>
        </div>}
      </main>
      {(showModal || editingTransaction) && <TransactionModal selectedMonth={selectedMonth} transaction={editingTransaction} onClose={closeModal} onSave={handleSaveTransaction} />}
    </div>
  )
}

/** Wraps the shell in the app-wide providers. */
export default function App() {
  return (
    <AppProviders>
      <AppShell />
    </AppProviders>
  )
}
import AnnualCategoryBreakdown from './components/charts/AnnualCategoryBreakdown.jsx'
import AnnualFlowChart from './components/charts/AnnualFlowChart.jsx'
import CashFlowChart from './components/charts/CashFlowChart.jsx'
import InvestmentHistoryChart from './components/charts/InvestmentHistoryChart.jsx'
import PositionEvolutionChart from './components/charts/PositionEvolutionChart.jsx'
import SpendingBreakdown from './components/charts/SpendingBreakdown.jsx'
import FireMeterCompact from './components/fire/FireMeterCompact.jsx'
import FixedIncomeModal from './components/investments/FixedIncomeModal.jsx'
import FixedIncomePage from './components/investments/FixedIncomePage.jsx'
import InvestmentAllocation from './components/investments/InvestmentAllocation.jsx'
import InvestmentHistoryModal from './components/investments/InvestmentHistoryModal.jsx'
import InvestmentModal from './components/investments/InvestmentModal.jsx'
import InvestmentsPage from './components/investments/InvestmentsPage.jsx'
import SavingsAccountModal from './components/investments/SavingsAccountModal.jsx'
import SavingsDepositModal from './components/investments/SavingsDepositModal.jsx'
import SavingsPage from './components/investments/SavingsPage.jsx'
import GlobalPositionPage from './components/position/GlobalPositionPage.jsx'
import ProfilePage from './components/profile/ProfilePage.jsx'
import FirePage from './components/fire/FirePage.jsx'
import RecurringPage from './components/recurring/RecurringPage.jsx'
import StatisticsPage from './components/statistics/StatisticsPage.jsx'
import AllTransactionsPage from './components/transactions/AllTransactionsPage.jsx'
import TransactionModal from './components/transactions/TransactionModal.jsx'
import Avatar from './components/ui/Avatar.jsx'
import IconBadge from './components/ui/IconBadge.jsx'
import PlatformSelector from './components/ui/PlatformSelector.jsx'

