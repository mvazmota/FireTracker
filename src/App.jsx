import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import {
  Bitcoin, CalendarDays, ChartLine, CircleHelp, Ellipsis, Flame, HandCoins, Landmark,
  LogOut, ReceiptText, Repeat, UserRound, Wallet,
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
import { dateForMonth } from './lib/dates.js'
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
        {activePage === 'profile' ? <ProfilePage /> : activePage === 'position' ? <GlobalPositionPage transactions={transactions} records={{ etfs: investmentVisibility.etfs ? holdings : [], crypto: investmentVisibility.crypto ? cryptoHoldings : [], p2p: investmentVisibility.p2p ? p2pRecords : [], bonds: investmentVisibility.bonds ? bondHoldings : [], savings: investmentVisibility.savings ? savingsAccounts : [] }} visibility={investmentVisibility} currentPosition={globalPosition} currentCash={trackedCash} /> : activePage === 'fire' ? <FirePage /> : activePage === 'transactions' ? <AllTransactionsPage transactions={transactions} selectedMonth={selectedMonth} onAdd={() => setShowModal(true)} onEdit={setEditingTransaction} onDelete={removeTransaction} onSaveMany={saveTransactions} /> : activePage === 'recurring' ? <RecurringPage /> : activePage === 'etfs' || activePage === 'crypto' ? <InvestmentsPage holdings={activePage === 'etfs' ? holdings : cryptoHoldings} assetType={activePage === 'etfs' ? 'etf' : 'crypto'} onSave={(record, captureCurrent) => savePortfolioRecord(activePage, record, captureCurrent)} onDelete={(id) => removePortfolioRecord(activePage, id)} /> : activePage === 'p2p' || activePage === 'bonds' ? <FixedIncomePage kind={activePage} records={activePage === 'p2p' ? p2pRecords : bondHoldings} onSave={(record, captureCurrent) => savePortfolioRecord(activePage, record, captureCurrent)} onDelete={(id) => removePortfolioRecord(activePage, id)} /> : activePage === 'savings' ? <SavingsPage accounts={savingsAccounts} onSave={saveSavingsAccount} onDelete={(account) => saveSavingsAccounts(savingsAccounts.filter((item) => item.id !== account.id))} /> : activePage === 'statistics' ? <StatisticsPage transactions={transactions} onFillSample={fillSampleHistory} />           : <OverviewPage
            summary={summary}
            fire={fire}
            selectedMonth={selectedMonth}
            onShiftMonth={shiftMonth}
            onToday={() => setSelectedMonth(dateForMonth(today))}
            hasVisibleInvestments={hasVisibleInvestments}
            investmentVisibility={investmentVisibility}
            onAddTransaction={() => setShowModal(true)}
            onEditTransaction={setEditingTransaction}
            onDeleteTransaction={removeTransaction}
            onSelectPortfolioPage={selectPortfolioPage}
            fireMeterVisible={fireMeterVisible}
            transactions={transactions}
            records={{ etfs: investmentVisibility.etfs ? holdings : [], crypto: investmentVisibility.crypto ? cryptoHoldings : [], p2p: investmentVisibility.p2p ? p2pRecords : [], bonds: investmentVisibility.bonds ? bondHoldings : [], savings: investmentVisibility.savings ? savingsAccounts : [] }}
          />}
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
import InvestmentHistoryChart from './components/charts/InvestmentHistoryChart.jsx'
import PositionEvolutionChart from './components/charts/PositionEvolutionChart.jsx'
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
import OverviewPage from './components/overview/OverviewPage.jsx'
import ProfilePage from './components/profile/ProfilePage.jsx'
import FirePage from './components/fire/FirePage.jsx'
import RecurringPage from './components/recurring/RecurringPage.jsx'
import StatisticsPage from './components/statistics/StatisticsPage.jsx'
import AllTransactionsPage from './components/transactions/AllTransactionsPage.jsx'
import TransactionModal from './components/transactions/TransactionModal.jsx'
import Avatar from './components/ui/Avatar.jsx'
import PlatformSelector from './components/ui/PlatformSelector.jsx'

