import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDownLeft, ArrowLeft, ArrowRight, ArrowUpRight, Bitcoin, CalendarDays, Camera, ChartLine,
  Check, ChevronDown, CircleHelp, Clock, Coffee, CreditCard, Ellipsis, Flame, HandCoins, Landmark,
  Film, ForkKnife, Gift, HeartPulse, House, Pencil, Plus, Search, ShoppingBag,
  ReceiptText, SlidersHorizontal, Sparkles, Tag, TrendingUp, UserRound, Wallet, X,
} from 'lucide-react'

import {
  BONDS_STORAGE_KEY,
  CRYPTO_STORAGE_KEY,
  CUSTOM_CATEGORIES_STORAGE_KEY,
  FIRE_GOAL_STORAGE_KEY,
  INVESTMENT_STORAGE_KEY,
  LANGUAGE_KEY,
  P2P_STORAGE_KEY,
  PLATFORMS_STORAGE_KEY,
  PROFILE_STORAGE_KEY,
  SAVINGS_STORAGE_KEY,
  STORAGE_KEY,
  VISIBILITY_STORAGE_KEY,
} from './lib/constants.js'
import { dateForMonth, dateKey, formatDateTime, monthKey, normalizeTransactionDate, timeStamp } from './lib/dates.js'
import { formatCurrency, formatPercent, formatRate } from './lib/format.js'
import { initialsForName, resizeImageFile } from './lib/image.js'
import { assetMarketValue, investmentTypeFromTransaction, portfolioCostBasis } from './lib/portfolio.js'
import { buildPositionTimeline } from './lib/timeline.js'
import { demoTransactionsForEmptyMonths } from './lib/simulation.js'
import {
  loadBonds,
  loadCrypto,
  loadCustomCategories,
  loadFireGoal,
  loadInvestments,
  loadInvestmentVisibility,
  loadP2P,
  loadPlatforms,
  loadSavingsAccounts,
  loadTransactions,
  loadUserProfile,
} from './lib/storage.js'
import { categories, categoryInfo } from './data/categories.js'
import { messages } from './i18n/messages.jsx'

function IconBadge({ icon: Icon, color }) {
  return <span className="transaction-icon" style={{ '--icon-color': color }}><Icon size={18} strokeWidth={1.8} /></span>
}

function PlatformSelector({ id, label, value, onChange, platforms, language }) {
  const t = messages[language]
  const [creating, setCreating] = useState(false)
  const extra = value && !platforms.includes(value) ? [value] : []
  if (creating) return <div className="platform-field"><label className="field-label" htmlFor={`${id}-custom`}>{label}</label><div className="platform-add-row"><input className="platform-custom-input" id={`${id}-custom`} autoFocus placeholder={t.platformPlaceholder} value={value} onChange={(event) => onChange(event.target.value)} /><button className="icon-button" type="button" onClick={() => { setCreating(false); onChange('') }} aria-label={t.noPlatform}><X size={16} /></button></div></div>
  return <div className="platform-field"><label className="field-label" htmlFor={id}>{label}</label><div className="select-wrap"><select id={id} value={value} onChange={(event) => { if (event.target.value === '__add_platform__') { setCreating(true); onChange('') } else onChange(event.target.value) }}><option value="">{t.noPlatform}</option>{extra.map((platform) => <option key={platform} value={platform}>{platform}</option>)}{platforms.map((platform) => <option key={platform} value={platform}>{platform}</option>)}<option value="__add_platform__">{t.addPlatform}</option></select><ChevronDown size={16} /></div></div>
}

function Modal({ language, onClose, onSave, selectedMonth, transaction, platforms, customCategories }) {
  const t = messages[language]
  const [type, setType] = useState(transaction?.type || 'expense')
  const [title, setTitle] = useState(transaction?.title || '')
  const [amount, setAmount] = useState(transaction ? String(transaction.amount) : '')
  const [category, setCategory] = useState(transaction?.category || categories.expense[0].name)
  const [platform, setPlatform] = useState(transaction?.platform || '')
  const [creatingCategory, setCreatingCategory] = useState(false)
  const [newCategory, setNewCategory] = useState('')
  const now = new Date()
  const fallbackDay = Math.min(now.getDate(), new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).getDate())
  const fallbackDateTime = monthKey(selectedMonth) === monthKey(now) ? timeStamp(now) : `${monthKey(selectedMonth)}-${String(fallbackDay).padStart(2, '0')}T12:00:00`
  const initialDateTime = transaction?.date ? normalizeTransactionDate(transaction.date) : fallbackDateTime
  const [date, setDate] = useState(initialDateTime.slice(0, 10))
  const [time, setTime] = useState(initialDateTime.slice(11, 16))
  const [error, setError] = useState('')
  const customEntries = [...(customCategories[type] || []).map((name) => ({ name })), ...(category && !categories[type].some((item) => item.name === category) && !(customCategories[type] || []).includes(category) ? [{ name: category }] : [])]
  const categoryOptions = [...categories[type], ...customEntries]

  function changeType(nextType) {
    setType(nextType)
    setCategory(categories[nextType][0].name)
    setCreatingCategory(false)
    setNewCategory('')
  }

  function submit(event) {
    event.preventDefault()
    if (!title.trim()) return setError(t.nameError)
    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) return setError(t.amountError)
    if (date.slice(0, 7) !== monthKey(selectedMonth)) return setError(t.dateError)
    const finalCategory = creatingCategory ? newCategory.trim() : category
    if (!finalCategory) return setError(t.categoryNameError)
    const timeValue = /^\d{2}:\d{2}$/.test(time) ? time : '12:00'
    onSave({ id: transaction?.id || crypto.randomUUID(), title: title.trim(), category: finalCategory, type, amount: Number(amount), date: `${date}T${timeValue}:00`, platform: platform.trim() })
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-top"><div><p className="eyebrow">{transaction ? t.editTransaction : t.newTransaction}</p><h2 id="modal-title">{transaction ? t.updateTransaction : t.addToMonth}</h2></div><button className="icon-button" onClick={onClose} aria-label={t.close}><X size={19} /></button></div>
        <div className="type-switch" role="group" aria-label={t.transactionType}>
          <button type="button" className={type === 'expense' ? 'selected expense-selected' : ''} onClick={() => changeType('expense')}><ArrowUpRight size={16} /> {t.expense}</button>
          <button type="button" className={type === 'income' ? 'selected income-selected' : ''} onClick={() => changeType('income')}><ArrowDownLeft size={16} /> {t.income.charAt(0) + t.income.slice(1).toLowerCase()}</button>
        </div>
        <form onSubmit={submit}>
          <label className="field-label" htmlFor="transaction-title">{t.whatFor}</label>
          <input id="transaction-title" autoFocus placeholder={t.titlePlaceholder} value={title} onChange={(event) => setTitle(event.target.value)} />
          <div className="form-row">
            <div><label className="field-label" htmlFor="transaction-amount">{t.amountEuro}</label><div className="amount-input"><span>â‚¬</span><input id="transaction-amount" type="number" min="0.01" step="0.01" placeholder="0.00" value={amount} onChange={(event) => setAmount(event.target.value)} /></div></div>
            <div><label className="field-label" htmlFor="transaction-date">{t.date}</label><div className="date-input"><CalendarDays size={16} /><input id="transaction-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></div></div>
          </div>
          <div className="form-row">
            <div><label className="field-label" htmlFor="transaction-time">{t.time}</label><div className="date-input"><Clock size={16} /><input id="transaction-time" type="time" value={time} onChange={(event) => setTime(event.target.value)} /></div></div>
            <div><label className="field-label" htmlFor="transaction-category">{t.categoryLabel}</label>{creatingCategory ? <div className="platform-add-row"><input className="platform-custom-input" id="transaction-category" autoFocus placeholder={t.categoryName} value={newCategory} onChange={(event) => setNewCategory(event.target.value)} /><button className="icon-button" type="button" onClick={() => { setCreatingCategory(false); setNewCategory('') }} aria-label={t.useCategories}><X size={16} /></button></div> : <div className="select-wrap"><select id="transaction-category" value={category} onChange={(event) => { if (event.target.value === '__add_category__') { setCreatingCategory(true); setNewCategory('') } else setCategory(event.target.value) }}>{categoryOptions.map((item) => <option key={item.name} value={item.name}>{t.categoryNames[item.name] || item.name}</option>)}<option value="__add_category__">{t.addCategory}</option></select><ChevronDown size={16} /></div>}</div>
          </div>
          <PlatformSelector id="transaction-platform" label={t.platform} value={platform} onChange={setPlatform} platforms={platforms} language={language} />
          {error && <p className="form-error">{error}</p>}
          <button className="submit-button" type="submit">{transaction ? <Check size={17} /> : <Plus size={17} />} {transaction ? t.saveChanges : type === 'income' ? t.addIncome : t.addExpense}</button>
        </form>
      </section>
    </div>
  )
}

function InvestmentModal({ language, holding, onClose, onSave, platforms, assetType = 'etf' }) {
  const t = messages[language]
  const isCrypto = assetType === 'crypto'
  const [symbol, setSymbol] = useState(holding?.symbol || '')
  const [name, setName] = useState(holding?.name || '')
  const [platform, setPlatform] = useState(holding?.platform || '')
  const [units, setUnits] = useState(holding ? String(holding.units) : '')
  const [averageCost, setAverageCost] = useState(holding ? String(holding.averageCost) : '')
  const [currentPrice, setCurrentPrice] = useState(holding ? String(holding.currentPrice) : '')
  const [error, setError] = useState('')

  function submit(event) {
    event.preventDefault()
    if (!symbol.trim()) return setError(t.requiredTicker)
    if (!name.trim()) return setError(t.requiredName)
    if (!platform.trim()) return setError(t.platformRequired)
    if (!Number.isFinite(Number(units)) || Number(units) <= 0) return setError(t.invalidUnits)
    if (![averageCost, currentPrice].every((value) => value.trim() !== '' && Number.isFinite(Number(value)) && Number(value) >= 0)) return setError(t.invalidPrice)
    onSave({ ...holding, id: holding?.id || crypto.randomUUID(), symbol: symbol.trim().toUpperCase(), name: name.trim(), platform, units: Number(units), averageCost: Number(averageCost), currentPrice: Number(currentPrice) })
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal investment-modal" role="dialog" aria-modal="true" aria-labelledby="investment-modal-title">
        <div className="modal-top"><div><p className="eyebrow">{holding ? t.editRecord.toUpperCase() : isCrypto ? t.addCrypto.toUpperCase() : t.addETF.toUpperCase()}</p><h2 id="investment-modal-title">{holding ? isCrypto ? t.editCryptoTitle : t.editETFTitle : isCrypto ? t.addCryptoTitle : t.addETFTitle}</h2></div><button className="icon-button" onClick={onClose} aria-label={t.close}><X size={19} /></button></div>
        <form onSubmit={submit}>
          <div className="form-row"><div><label className="field-label" htmlFor="etf-symbol">{t.ticker}</label><input className="investment-field" id="etf-symbol" autoFocus placeholder={t.tickerPlaceholder} value={symbol} onChange={(event) => setSymbol(event.target.value.toUpperCase())} /></div><div><label className="field-label" htmlFor="etf-units">{t.unitsOwned}</label><input className="investment-field" id="etf-units" type="number" min="0.0001" step="any" placeholder={t.unitsPlaceholder} value={units} onChange={(event) => setUnits(event.target.value)} /></div></div>
          <label className="field-label" htmlFor="etf-name">{isCrypto ? t.cryptoName : t.fundName}</label><input className="investment-field" id="etf-name" placeholder={isCrypto ? t.cryptoPlaceholder : t.fundPlaceholder} value={name} onChange={(event) => setName(event.target.value)} />
          <PlatformSelector id="asset-platform" label={t.platform} value={platform} onChange={setPlatform} platforms={platforms} language={language} />
          <div className="form-row"><div><label className="field-label" htmlFor="etf-average-cost">{t.averageBuyPrice}</label><div className="amount-input"><span>â‚¬</span><input id="etf-average-cost" type="number" min="0" step="0.01" placeholder={t.pricePlaceholder} value={averageCost} onChange={(event) => setAverageCost(event.target.value)} /></div></div><div><label className="field-label" htmlFor="etf-current-price">{t.currentPriceEuro}</label><div className="amount-input"><span>â‚¬</span><input id="etf-current-price" type="number" min="0" step="0.01" placeholder={t.pricePlaceholder} value={currentPrice} onChange={(event) => setCurrentPrice(event.target.value)} /></div></div></div>
          {error && <p className="form-error">{error}</p>}
          <button className="submit-button" type="submit">{holding ? <Check size={17} /> : <Plus size={17} />} {holding ? t.saveETF : t.addToPortfolio}</button>
        </form>
      </section>
    </div>
  )
}

function InvestmentAllocation({ holdings, language, emptyLabel }) {
  const t = messages[language]
  const palette = ['#78b7a0', '#89a9da', '#efa77c', '#ad9be0', '#df89a0', '#e7c46f']
  const totalValue = holdings.reduce((sum, holding) => sum + holding.units * holding.currentPrice, 0)
  let offset = 0
  const stops = holdings.map((holding, index) => {
    const start = offset
    offset += totalValue ? (holding.units * holding.currentPrice / totalValue) * 100 : 0
    return `${palette[index % palette.length]} ${start}% ${offset}%`
  })
  const background = totalValue ? `conic-gradient(${stops.join(', ')})` : 'conic-gradient(#e9ede7 0% 100%)'
  return (
    <article className="panel investment-allocation-panel"><div className="panel-heading"><div><h2>{t.allocation}</h2><p>{t.allocationSubtitle}</p></div><span className="panel-icon"><ChartLine size={17} /></span></div><div className="investment-allocation-content"><div className="donut" style={{ background }}><div className="donut-hole"><span>{t.marketValue.toLowerCase()}</span><strong>{formatCurrency(totalValue, language)}</strong></div></div><div className="investment-legend">{holdings.length ? holdings.map((holding, index) => <div className="investment-legend-row" key={holding.id}><span className="investment-fund-label"><i style={{ background: palette[index % palette.length] }} /><strong>{holding.symbol}</strong></span><span>{formatCurrency(holding.units * holding.currentPrice, language)}</span></div>) : <p className="empty-note">{emptyLabel}</p>}</div></div></article>
  )
}

function InvestmentHistoryChart({ history, language }) {
  const t = messages[language]
  const locale = language === 'pt' ? 'pt-PT' : 'en-IE'
  const ordered = [...(history || [])].sort((a, b) => a.month.localeCompare(b.month))
  if (!ordered.length) return <div className="history-empty-chart"><span className="empty-icon"><ChartLine size={20} /></span><p>{t.noHistory}</p></div>
  const width = Math.max(520, ordered.length * 54)
  const values = ordered.map((point) => point.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || Math.max(1, max * 0.1)
  const points = ordered.map((point, index) => `${28 + (index * (width - 56)) / Math.max(1, ordered.length - 1)},${145 - ((point.value - min) / range) * 100}`).join(' ')
  return <div className="history-chart-scroll"><svg className="history-chart" style={{ width: `${width}px` }} viewBox={`0 0 ${width} 190`} role="img" aria-label={t.historyTrend}>
    {[45, 95, 145].map((y) => <line key={y} x1="20" x2={width - 20} y1={y} y2={y} className="grid-line" />)}
    <polyline points={points} className="history-line" />
    {ordered.map((point, index) => { const x = 28 + (index * (width - 56)) / Math.max(1, ordered.length - 1); const y = 145 - ((point.value - min) / range) * 100; const label = new Intl.DateTimeFormat(locale, { month: 'short', year: '2-digit' }).format(new Date(`${point.month}-01T12:00:00`)); return <g key={point.month}><circle cx={x} cy={y} r="3.5" className="history-point" /><text x={x} y="176" className="chart-label" textAnchor="middle">{label}</text></g> })}
  </svg></div>
}

function InvestmentHistoryModal({ language, kind, record, onClose, onSave }) {
  const t = messages[language]
  const now = new Date()
  const currentMonth = monthKey(now)
  const currentValue = assetMarketValue(record, kind)
  const [month, setMonth] = useState(currentMonth)
  const [value, setValue] = useState(String(currentValue))
  const [error, setError] = useState('')
  const locale = language === 'pt' ? 'pt-PT' : 'en-IE'
  const label = kind === 'etfs' || kind === 'crypto' ? `${record.symbol} Â· ${record.name}` : record.name

  useEffect(() => {
    const snapshot = record.history?.find((item) => item.month === month)
    setValue(snapshot ? String(snapshot.value) : month === currentMonth ? String(currentValue) : '')
  }, [month, currentMonth, currentValue, record.history])

  function submit(event) {
    event.preventDefault()
    if (!month || month > currentMonth) return setError(t.futureMonth)
    if (value.trim() === '' || !Number.isFinite(Number(value)) || Number(value) < 0) return setError(t.historyValueError)
    const history = [...(record.history || []).filter((item) => item.month !== month), { month, value: Number(value), invested: kind === 'savings' ? 0 : portfolioCostBasis(record, kind) }].sort((a, b) => a.month.localeCompare(b.month))
    const updated = { ...record, history }
    if (month === currentMonth) {
      if (kind === 'etfs' || kind === 'crypto') updated.currentPrice = record.units ? Number(value) / record.units : record.currentPrice
      else if (kind === 'savings') updated.balance = Number(value)
      else updated.currentValue = Number(value)
    }
    onSave(updated)
  }

  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="modal history-modal" role="dialog" aria-modal="true" aria-labelledby="history-modal-title">
    <div className="modal-top"><div><p className="eyebrow">{t.monthlyHistory.toUpperCase()}</p><h2 id="history-modal-title">{label}</h2></div><button className="icon-button" onClick={onClose} aria-label={t.close}><X size={19} /></button></div>
    <p className="history-intro">{t.historySubtitle}</p><InvestmentHistoryChart history={record.history} language={language} />
    <form className="history-form" onSubmit={submit}><div className="form-row"><div><label className="field-label" htmlFor="history-month">{t.month}</label><input className="investment-field" id="history-month" type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></div><div><label className="field-label" htmlFor="history-value">{t.portfolioValue}</label><div className="amount-input"><span>â‚¬</span><input id="history-value" type="number" min="0" step="0.01" placeholder="0.00" value={value} onChange={(event) => setValue(event.target.value)} /></div></div></div>{error && <p className="form-error">{error}</p>}<button className="submit-button" type="submit"><Check size={17} /> {t.saveSnapshot}</button></form>
    <p className="history-count">{record.history?.length || 0} {t.snapshots}</p>
  </section></div>
}

function InvestmentsPage({ language, holdings, onSave, onDelete, platforms, assetType = 'etf' }) {
  const t = messages[language]
  const isCrypto = assetType === 'crypto'
  const pageHeading = isCrypto ? t.cryptoHeading : t.etfsHeading
  const pageSubtitle = isCrypto ? t.cryptoDescription : t.portfolioSubtitle
  const addLabel = isCrypto ? t.addCrypto : t.addETF
  const listHeading = isCrypto ? t.cryptoHoldings : t.holdings
  const emptyHeading = isCrypto ? t.noCrypto : t.noHoldings
  const emptyMessage = isCrypto ? t.addFirstCrypto : t.addFirstETF
  const [editingHolding, setEditingHolding] = useState(null)
  const [historyRecord, setHistoryRecord] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const totalInvested = holdings.reduce((sum, holding) => sum + holding.units * holding.averageCost, 0)
  const marketValue = holdings.reduce((sum, holding) => sum + holding.units * holding.currentPrice, 0)
  const unrealised = marketValue - totalInvested
  const returnRate = totalInvested ? (unrealised / totalInvested) * 100 : 0
  const numberFormat = new Intl.NumberFormat(language === 'pt' ? 'pt-PT' : 'en-IE', { maximumFractionDigits: 4 })

  function closeModal() {
    setShowModal(false)
    setEditingHolding(null)
  }

  function saveHolding(holding) {
    onSave(holding)
    closeModal()
  }

  function saveHistory(record) {
    onSave(record, false)
    setHistoryRecord(null)
  }

  return (
    <div className="page-content investments-page">
      <section className="welcome-row"><div><p className="eyebrow">{t.portfolioEyebrow}</p><h1>{pageHeading}<span>.</span></h1><p className="welcome-sub">{pageSubtitle}</p></div><button className="primary-button" onClick={() => setShowModal(true)}><Plus size={18} strokeWidth={2.4} /> {addLabel}</button></section>
      <section className="summary-grid investment-summary" aria-label={t.investments}>
        <article className="summary-card balance-card"><div className="summary-label">{t.marketValue}<span className="summary-symbol"><ChartLine size={16} /></span></div><div className="summary-amount">{formatCurrency(marketValue, language)}</div><div className="summary-foot">{t.currentPortfolio}</div><div className="balance-art"><span /><span /><span /></div></article>
        <article className="summary-card"><div className="summary-label">{t.totalInvested}<span className="summary-symbol income-symbol"><Wallet size={16} /></span></div><div className="summary-amount">{formatCurrency(totalInvested, language)}</div><div className="summary-foot">{t.investedSoFar}</div></article>
        <article className="summary-card"><div className="summary-label">{t.unrealisedReturn}<span className="summary-symbol savings-symbol"><TrendingUp size={16} /></span></div><div className={`summary-amount ${unrealised < 0 ? 'negative-return' : 'positive-return'}`}>{unrealised >= 0 ? '+' : 'âˆ’'}{formatCurrency(Math.abs(unrealised), language)}</div><div className="summary-foot"><span className={`trend-chip ${unrealised < 0 ? 'negative-chip' : ''}`}>{formatPercent(returnRate, language)}</span>{t.basedOnPrices}</div></article>
        <article className="summary-card"><div className="summary-label">{isCrypto ? t.cryptoCount : t.ETFCount}<span className="summary-symbol expense-symbol">{isCrypto ? <Bitcoin size={16} /> : <ChartLine size={16} />}</span></div><div className="summary-amount">{holdings.length}</div><div className="summary-foot">{t.assetsTracked}</div></article>
      </section>
      <section className="insights-grid investment-insights"><InvestmentAllocation holdings={holdings} language={language} emptyLabel={emptyHeading} /><article className="panel manual-pricing-panel"><span className="manual-pricing-icon">{isCrypto ? <Bitcoin size={18} /> : <ChartLine size={18} />}</span><div><strong>{language === 'pt' ? 'Acompanha ao teu ritmo' : 'Your portfolio, your pace'}</strong><p>{t.manualPrices}</p></div><span className="manual-pricing-tag">MANUAL</span></article></section>
      <section className="panel holdings-panel"><div className="transactions-heading"><div><h2>{listHeading}</h2><p>{t.holdingsSubtitle}</p></div><button className="text-button" onClick={() => setShowModal(true)}><Plus size={15} /> {addLabel}</button></div>
        {holdings.length ? <div className="holdings-table-wrap"><table className="holdings-table"><thead><tr><th>{t.symbol}</th><th>{t.platform}</th><th>{t.units}</th><th>{t.avgCost}</th><th>{t.currentPrice}</th><th>{t.value}</th><th>{t.return}</th><th><span className="sr-only">{t.history}</span></th></tr></thead><tbody>{holdings.map((holding) => { const invested = holding.units * holding.averageCost; const value = holding.units * holding.currentPrice; const gain = value - invested; const percentage = invested ? (gain / invested) * 100 : 0; return <tr key={holding.id}><td><button className="holding-fund" onClick={() => setEditingHolding(holding)} aria-label={`${t.editRecord}: ${holding.symbol}`}><span className="holding-symbol">{holding.symbol}</span><span className="holding-name">{holding.name}{holding.isDemo && <i className="sample-chip">{t.sampleData}</i>}</span></button></td><td><span className="platform-pill">{holding.platform || t.noPlatform}</span></td><td>{numberFormat.format(holding.units)}</td><td>{formatCurrency(holding.averageCost, language)}</td><td>{formatCurrency(holding.currentPrice, language)}</td><td className="holding-value">{formatCurrency(value, language)}</td><td><span className={gain >= 0 ? 'holding-return positive-return' : 'holding-return negative-return'}>{gain >= 0 ? '+' : 'âˆ’'}{formatCurrency(Math.abs(gain), language)}<small>{formatPercent(percentage, language)}</small></span></td><td><div className="transaction-actions"><button className="history-row" onClick={() => setHistoryRecord(holding)} aria-label={`${t.history}: ${holding.symbol}`} title={t.history}><ChartLine size={15} /></button><button className="edit-row" onClick={() => setEditingHolding(holding)} aria-label={`${t.editRecord}: ${holding.symbol}`} title={t.edit}><Pencil size={15} /></button><button className="delete-row" onClick={() => onDelete(holding.id)} aria-label={`${t.removeRecord}: ${holding.symbol}`} title={t.delete}><X size={15} /></button></div></td></tr> })}</tbody></table></div> : <div className="empty-transactions"><span className="empty-icon">{isCrypto ? <Bitcoin size={21} /> : <ChartLine size={21} />}</span><strong>{emptyHeading}</strong><p>{emptyMessage}</p><button className="text-button" onClick={() => setShowModal(true)}><Plus size={15} /> {addLabel}</button></div>}
      </section>
      <footer className="page-footer"><span>{t.manualPrices}</span><span>{t.footerMonth} <span className="footer-heart">â™¥</span></span></footer>
      {(showModal || editingHolding) && <InvestmentModal language={language} holding={editingHolding} onClose={closeModal} onSave={saveHolding} platforms={platforms} assetType={assetType} />}
      {historyRecord && <InvestmentHistoryModal language={language} kind={assetType === 'crypto' ? 'crypto' : 'etfs'} record={historyRecord} onClose={() => setHistoryRecord(null)} onSave={saveHistory} />}
    </div>
  )
}

function FixedIncomeModal({ language, kind, record, onClose, onSave, platforms }) {
  const t = messages[language]
  const isBond = kind === 'bonds'
  const [platform, setPlatform] = useState(record?.platform || '')
  const [name, setName] = useState(record?.name || '')
  const [issuer, setIssuer] = useState(record?.issuer || '')
  const [invested, setInvested] = useState(String(record?.invested ?? record?.investedValue ?? ''))
  const [currentValue, setCurrentValue] = useState(String(record?.currentValue ?? ''))
  const [annualRate, setAnnualRate] = useState(String(record?.annualRate ?? record?.couponRate ?? ''))
  const [nominalValue, setNominalValue] = useState(String(record?.nominalValue ?? ''))
  const [purchaseValue, setPurchaseValue] = useState(String(record?.investedValue ?? ''))
  const [maturityDate, setMaturityDate] = useState(record?.maturityDate || '')
  const [error, setError] = useState('')
  const numberIsValid = (value, allowZero = false) => value.trim() !== '' && Number.isFinite(Number(value)) && (allowZero ? Number(value) >= 0 : Number(value) > 0)

  function submit(event) {
    event.preventDefault()
    if (isBond ? !name.trim() : !platform.trim() || !name.trim()) return setError(isBond ? t.nameRequired : t.providerRequired)
    if (isBond && !issuer.trim()) return setError(t.providerRequired)
    if (isBond && !platform.trim()) return setError(t.platformRequired)
    const amountsValid = isBond
      ? numberIsValid(nominalValue) && numberIsValid(purchaseValue) && numberIsValid(currentValue, true)
      : numberIsValid(invested) && numberIsValid(currentValue, true)
    if (!amountsValid) return setError(t.investmentAmountsError)
    if (annualRate && !numberIsValid(annualRate, true)) return setError(t.rateError)
    if (isBond && !maturityDate) return setError(t.maturityRequired)
    onSave(isBond
      ? { ...record, id: record?.id || crypto.randomUUID(), name: name.trim(), issuer: issuer.trim(), platform: platform.trim(), nominalValue: Number(nominalValue), investedValue: Number(purchaseValue), currentValue: Number(currentValue), couponRate: Number(annualRate || 0), maturityDate }
      : { ...record, id: record?.id || crypto.randomUUID(), platform: platform.trim(), name: name.trim(), invested: Number(invested), currentValue: Number(currentValue), annualRate: Number(annualRate || 0) })
  }

  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="modal investment-modal" role="dialog" aria-modal="true" aria-labelledby="fixed-income-modal-title">
    <div className="modal-top"><div><p className="eyebrow">{record ? t.editRecord.toUpperCase() : (isBond ? t.addBond : t.addP2P).toUpperCase()}</p><h2 id="fixed-income-modal-title">{record ? (isBond ? t.bondsHeading : t.p2pHeading) : (isBond ? t.addBond : t.addP2P)}</h2></div><button className="icon-button" onClick={onClose} aria-label={t.close}><X size={19} /></button></div>
    <form onSubmit={submit}>
      {isBond ? <>
        <label className="field-label" htmlFor="fixed-name">{t.bondName}</label><input className="investment-field" id="fixed-name" autoFocus placeholder={language === 'pt' ? 'ex.: ObrigaÃ§Ã£o do Tesouro' : 'e.g. Treasury bond 2030'} value={name} onChange={(event) => setName(event.target.value)} />
        <PlatformSelector id="fixed-platform" label={t.platform} value={platform} onChange={setPlatform} platforms={platforms} language={language} />
        <div className="form-row"><div><label className="field-label" htmlFor="fixed-issuer">{t.issuer}</label><input className="investment-field" id="fixed-issuer" placeholder={language === 'pt' ? 'ex.: RepÃºblica Portuguesa' : 'e.g. Government of Portugal'} value={issuer} onChange={(event) => setIssuer(event.target.value)} /></div><div><label className="field-label" htmlFor="fixed-maturity">{t.maturityDate}</label><input className="investment-field" id="fixed-maturity" type="date" value={maturityDate} onChange={(event) => setMaturityDate(event.target.value)} /></div></div>
        <div className="form-row"><div><label className="field-label" htmlFor="fixed-nominal">{t.nominalValue}</label><div className="amount-input"><span>â‚¬</span><input id="fixed-nominal" type="number" min="0.01" step="0.01" placeholder={t.pricePlaceholder} value={nominalValue} onChange={(event) => setNominalValue(event.target.value)} /></div></div><div><label className="field-label" htmlFor="fixed-purchase">{t.purchaseValue}</label><div className="amount-input"><span>â‚¬</span><input id="fixed-purchase" type="number" min="0.01" step="0.01" placeholder={t.pricePlaceholder} value={purchaseValue} onChange={(event) => setPurchaseValue(event.target.value)} /></div></div></div>
        <div className="form-row"><div><label className="field-label" htmlFor="fixed-current">{t.bondCurrentValue}</label><div className="amount-input"><span>â‚¬</span><input id="fixed-current" type="number" min="0" step="0.01" placeholder={t.pricePlaceholder} value={currentValue} onChange={(event) => setCurrentValue(event.target.value)} /></div></div><div><label className="field-label" htmlFor="fixed-rate">{t.couponRate}</label><div className="amount-input"><input id="fixed-rate" type="number" min="0" step="0.01" placeholder="0.00" value={annualRate} onChange={(event) => setAnnualRate(event.target.value)} /><span>%</span></div></div></div>
      </> : <>
        <div className="form-row"><div><PlatformSelector id="fixed-platform" label={t.platform} value={platform} onChange={setPlatform} platforms={platforms} language={language} /></div><div><label className="field-label" htmlFor="fixed-name">{t.projectName}</label><input className="investment-field" id="fixed-name" autoFocus placeholder={language === 'pt' ? 'ex.: Carteira diversificada' : 'e.g. Diversified loan portfolio'} value={name} onChange={(event) => setName(event.target.value)} /></div></div>
        <div className="form-row"><div><label className="field-label" htmlFor="fixed-invested">{t.amountInvested}</label><div className="amount-input"><span>â‚¬</span><input id="fixed-invested" type="number" min="0.01" step="0.01" placeholder={t.pricePlaceholder} value={invested} onChange={(event) => setInvested(event.target.value)} /></div></div><div><label className="field-label" htmlFor="fixed-current">{t.accountValue}</label><div className="amount-input"><span>â‚¬</span><input id="fixed-current" type="number" min="0" step="0.01" placeholder={t.pricePlaceholder} value={currentValue} onChange={(event) => setCurrentValue(event.target.value)} /></div></div></div>
        <label className="field-label" htmlFor="fixed-rate">{t.expectedReturn}</label><div className="amount-input"><input id="fixed-rate" type="number" min="0" step="0.01" placeholder="0.00" value={annualRate} onChange={(event) => setAnnualRate(event.target.value)} /><span>%</span></div>
      </>}
      {error && <p className="form-error">{error}</p>}<button className="submit-button" type="submit">{record ? <Check size={17} /> : <Plus size={17} />} {record ? t.saveRecord : t.addRecord}</button>
    </form>
  </section></div>
}

function FixedIncomePage({ language, kind, records, onSave, onDelete, platforms }) {
  const t = messages[language]
  const isBond = kind === 'bonds'
  const [editing, setEditing] = useState(null)
  const [historyRecord, setHistoryRecord] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const title = isBond ? t.bondsHeading : t.p2pHeading
  const addLabel = isBond ? t.addBond : t.addP2P
  const listHeading = isBond ? t.bondHoldings : t.p2pHoldings
  const noRecords = isBond ? t.noBonds : t.noP2P
  const addFirst = isBond ? t.addFirstBond : t.addFirstP2P
  const investedTotal = records.reduce((sum, item) => sum + (isBond ? item.investedValue : item.invested), 0)
  const marketTotal = records.reduce((sum, item) => sum + item.currentValue, 0)
  const gain = marketTotal - investedTotal
  const locale = language === 'pt' ? 'pt-PT' : 'en-IE'
  const countLabel = isBond ? t.bondCount : t.p2pCount

  function closeModal() { setShowModal(false); setEditing(null) }
  function saveRecord(record) { onSave(record); closeModal() }
  function saveHistory(record) { onSave(record, false); setHistoryRecord(null) }
  function formatMaturity(value) { return new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' }).format(new Date(`${value}T12:00:00`)) }

  return <div className="page-content investments-page fixed-income-page">
    <section className="welcome-row"><div><p className="eyebrow">{t.portfolioEyebrow}</p><h1>{title}<span>.</span></h1><p className="welcome-sub">{isBond ? t.bondsDescription : t.p2pDescription}</p></div><button className="primary-button" onClick={() => setShowModal(true)}><Plus size={18} /> {addLabel}</button></section>
    <section className="summary-grid investment-summary"><article className="summary-card balance-card"><div className="summary-label">{t.marketValue}<span className="summary-symbol">{isBond ? <Landmark size={16} /> : <HandCoins size={16} />}</span></div><div className="summary-amount">{formatCurrency(marketTotal, language)}</div><div className="summary-foot">{t.currentPortfolio}</div><div className="balance-art"><span /><span /><span /></div></article><article className="summary-card"><div className="summary-label">{t.totalInvested}<span className="summary-symbol income-symbol"><Wallet size={16} /></span></div><div className="summary-amount">{formatCurrency(investedTotal, language)}</div><div className="summary-foot">{t.investedSoFar}</div></article><article className="summary-card"><div className="summary-label">{t.unrealisedReturn}<span className="summary-symbol savings-symbol"><TrendingUp size={16} /></span></div><div className={`summary-amount ${gain < 0 ? 'negative-return' : 'positive-return'}`}>{gain < 0 ? 'âˆ’' : '+'}{formatCurrency(Math.abs(gain), language)}</div><div className="summary-foot"><span className={`trend-chip ${gain < 0 ? 'negative-chip' : ''}`}>{formatPercent(investedTotal ? gain / investedTotal * 100 : 0, language)}</span>{t.basedOnPrices}</div></article><article className="summary-card"><div className="summary-label">{countLabel}<span className="summary-symbol expense-symbol">{isBond ? <Landmark size={16} /> : <HandCoins size={16} />}</span></div><div className="summary-amount">{records.length}</div><div className="summary-foot">{t.assetsTracked}</div></article></section>
    <section className="panel manual-pricing-panel fixed-income-note"><span className="manual-pricing-icon">{isBond ? <Landmark size={18} /> : <HandCoins size={18} />}</span><div><strong>{isBond ? t.bondsHeading : t.p2pHeading}</strong><p>{isBond ? t.bondNote : t.p2pNote}</p></div><span className="manual-pricing-tag">{language === 'pt' ? 'MANUAL' : 'MANUAL'}</span></section>
    <section className="panel holdings-panel"><div className="transactions-heading"><div><h2>{listHeading}</h2><p>{t.holdingsSubtitle}</p></div><button className="text-button" onClick={() => setShowModal(true)}><Plus size={15} /> {addLabel}</button></div>
      {records.length ? <div className="holdings-table-wrap"><table className="holdings-table fixed-income-table"><thead>{isBond ? <tr><th>{t.bondName}</th><th>{t.platform}</th><th>{t.nominalValue}</th><th>{t.purchaseValue}</th><th>{t.value}</th><th>{t.couponRate}</th><th>{t.maturityDate}</th><th>{t.return}</th><th /></tr> : <tr><th>{t.platform}</th><th>{t.projectName}</th><th>{t.amountInvested}</th><th>{t.accountValue}</th><th>{t.expectedReturn}</th><th>{t.return}</th><th /></tr>}</thead><tbody>{records.map((record) => { const principal = isBond ? record.investedValue : record.invested; const difference = record.currentValue - principal; const gainPercent = principal ? difference / principal * 100 : 0; return isBond ? <tr key={record.id}><td><button className="holding-fund" onClick={() => setEditing(record)}><span className="holding-symbol"><Landmark size={15} /></span><span className="holding-name">{record.name}{record.isDemo && <i className="sample-chip">{t.sampleData}</i>}</span></button><small className="fixed-subline">{record.issuer}</small></td><td><span className="platform-pill">{record.platform || t.noPlatform}</span></td><td>{formatCurrency(record.nominalValue, language)}</td><td>{formatCurrency(record.investedValue, language)}</td><td className="holding-value">{formatCurrency(record.currentValue, language)}</td><td>{formatPercent(record.couponRate, language)}</td><td>{formatMaturity(record.maturityDate)}</td><td><span className={`holding-return ${difference >= 0 ? 'positive-return' : 'negative-return'}`}>{difference < 0 ? 'âˆ’' : '+'}{formatCurrency(Math.abs(difference), language)}<small>{formatPercent(gainPercent, language)}</small></span></td><td><div className="transaction-actions"><button className="edit-row" onClick={() => setEditing(record)} aria-label={`${t.editRecord}: ${record.name}`} title={t.edit}><Pencil size={15} /></button><button className="delete-row" onClick={() => onDelete(record.id)} aria-label={`${t.removeRecord}: ${record.name}`} title={t.delete}><X size={15} /></button></div></td></tr> : <tr key={record.id}><td><button className="holding-fund" onClick={() => setEditing(record)}><span className="holding-symbol"><HandCoins size={15} /></span><span className="holding-name">{record.platform}</span></button></td><td>{record.name}{record.isDemo && <i className="sample-chip">{t.sampleData}</i>}</td><td>{formatCurrency(record.invested, language)}</td><td className="holding-value">{formatCurrency(record.currentValue, language)}</td><td>{formatPercent(record.annualRate, language)}</td><td><span className={`holding-return ${difference >= 0 ? 'positive-return' : 'negative-return'}`}>{difference < 0 ? 'âˆ’' : '+'}{formatCurrency(Math.abs(difference), language)}<small>{formatPercent(gainPercent, language)}</small></span></td><td><div className="transaction-actions"><button className="edit-row" onClick={() => setEditing(record)} aria-label={`${t.editRecord}: ${record.name}`} title={t.edit}><Pencil size={15} /></button><button className="delete-row" onClick={() => onDelete(record.id)} aria-label={`${t.removeRecord}: ${record.name}`} title={t.delete}><X size={15} /></button></div></td></tr> })}</tbody></table></div> : <div className="empty-transactions"><span className="empty-icon">{isBond ? <Landmark size={21} /> : <HandCoins size={21} />}</span><strong>{noRecords}</strong><p>{addFirst}</p><button className="text-button" onClick={() => setShowModal(true)}><Plus size={15} /> {addLabel}</button></div>}
    </section>
    <section className="panel history-access-panel"><div className="transactions-heading"><div><h2>{t.monthlyHistory}</h2><p>{t.historySubtitle}</p></div></div><div className="history-access-grid">{records.map((record) => <button className="history-access-card" key={record.id} onClick={() => setHistoryRecord(record)}><span className="history-access-icon">{isBond ? <Landmark size={16} /> : <HandCoins size={16} />}</span><span className="history-access-name">{record.name}</span><span className="history-access-count">{record.history?.length || 0} {t.snapshots}</span><ChartLine size={15} className="history-access-arrow" /></button>)}</div></section>
    <footer className="page-footer"><span>{isBond ? t.bondNote : t.p2pNote}</span><span>{t.footerMonth} <span className="footer-heart">â™¥</span></span></footer>
    {(showModal || editing) && <FixedIncomeModal language={language} kind={kind} record={editing} onClose={closeModal} onSave={saveRecord} platforms={platforms} />}
    {historyRecord && <InvestmentHistoryModal language={language} kind={kind} record={historyRecord} onClose={() => setHistoryRecord(null)} onSave={saveHistory} />}
  </div>
}

function SavingsAccountModal({ language, account, onClose, onSave, platforms }) {
  const t = messages[language]
  const [name, setName] = useState(account?.name || '')
  const [institution, setInstitution] = useState(account?.institution || '')
  const [balance, setBalance] = useState(String(account?.balance ?? ''))
  const [rate, setRate] = useState(String(account?.annualRate ?? ''))
  const [error, setError] = useState('')

  function submit(event) {
    event.preventDefault()
    if (!name.trim() || !institution.trim()) return setError(t.nameRequired)
    if (balance.trim() === '' || !Number.isFinite(Number(balance)) || Number(balance) < 0) return setError(t.historyValueError)
    if (rate && (!Number.isFinite(Number(rate)) || Number(rate) < 0)) return setError(t.rateError)
    onSave({ ...account, id: account?.id || crypto.randomUUID(), name: name.trim(), institution: institution.trim(), platform: institution.trim(), balance: Number(balance), annualRate: Number(rate || 0) })
  }

  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="modal investment-modal" role="dialog" aria-modal="true" aria-labelledby="savings-modal-title">
    <div className="modal-top"><div><p className="eyebrow">{account ? t.editSavingsAccount.toUpperCase() : t.addSavingsAccount.toUpperCase()}</p><h2 id="savings-modal-title">{account ? t.editSavingsAccount : t.addSavingsAccount}</h2></div><button className="icon-button" onClick={onClose} aria-label={t.close}><X size={19} /></button></div>
    <form onSubmit={submit}>
      <label className="field-label" htmlFor="savings-name">{t.savingsAccountName}</label><input className="investment-field" id="savings-name" autoFocus placeholder={language === 'pt' ? 'ex.: Fundo de emergÃªncia' : 'e.g. Emergency fund'} value={name} onChange={(event) => setName(event.target.value)} />
      <div className="form-row"><div><PlatformSelector id="savings-institution" label={t.institution} value={institution} onChange={setInstitution} platforms={platforms} language={language} /></div><div><label className="field-label" htmlFor="savings-rate">{t.savingsRate}</label><div className="amount-input"><input id="savings-rate" type="number" min="0" step="0.01" placeholder="0.00" value={rate} onChange={(event) => setRate(event.target.value)} /><span>%</span></div></div></div>
      <label className="field-label" htmlFor="savings-balance">{t.openingBalance}</label><div className="amount-input"><span>â‚¬</span><input id="savings-balance" type="number" min="0" step="0.01" placeholder="0.00" value={balance} disabled={Boolean(account)} onChange={(event) => setBalance(event.target.value)} /></div>
      {account && <p className="history-intro">{t.savingsAccountNote}</p>}
      {error && <p className="form-error">{error}</p>}<button className="submit-button" type="submit">{account ? <Check size={17} /> : <Plus size={17} />} {account ? t.saveRecord : t.addSavingsAccount}</button>
    </form>
  </section></div>
}

function SavingsDepositModal({ language, account, onClose, onDeposit }) {
  const t = messages[language]
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  function submit(event) {
    event.preventDefault()
    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) return setError(t.amountError)
    onDeposit(Number(amount))
  }
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="modal investment-modal" role="dialog" aria-modal="true" aria-labelledby="savings-deposit-title">
    <div className="modal-top"><div><p className="eyebrow">{t.savingsCategory.toUpperCase()}</p><h2 id="savings-deposit-title">{t.addMoney}</h2><p className="history-intro">{account.name} Â· {formatCurrency(account.balance, language)}</p></div><button className="icon-button" onClick={onClose} aria-label={t.close}><X size={19} /></button></div>
    <form onSubmit={submit}><label className="field-label" htmlFor="savings-deposit-amount">{t.depositAmount}</label><div className="amount-input"><span>â‚¬</span><input id="savings-deposit-amount" autoFocus type="number" min="0.01" step="0.01" placeholder="0.00" value={amount} onChange={(event) => setAmount(event.target.value)} /></div>{error && <p className="form-error">{error}</p>}<button className="submit-button" type="submit"><Plus size={17} /> {t.addMoney}</button></form>
  </section></div>
}

function SavingsPage({ language, accounts, onSave, onDelete, platforms }) {
  const t = messages[language]
  const [editing, setEditing] = useState(null)
  const [historyAccount, setHistoryAccount] = useState(null)
  const [depositAccount, setDepositAccount] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const balance = accounts.reduce((sum, account) => sum + account.balance, 0)
  const weightedRate = balance ? accounts.reduce((sum, account) => sum + account.balance * account.annualRate, 0) / balance : 0

  function closeAccountModal() { setShowModal(false); setEditing(null) }
  function saveAccount(account) { onSave(account); closeAccountModal() }
  function addDeposit(amount) {
    onSave({ ...depositAccount, balance: depositAccount.balance + amount })
    setDepositAccount(null)
  }

  return <div className="page-content investments-page savings-page">
    <section className="welcome-row"><div><p className="eyebrow">{t.portfolioEyebrow}</p><h1>{t.savingsHeading}<span>.</span></h1><p className="welcome-sub">{t.savingsDescription}</p></div><button className="primary-button" onClick={() => setShowModal(true)}><Plus size={18} /> {t.addSavingsAccount}</button></section>
    <section className="summary-grid investment-summary"><article className="summary-card balance-card"><div className="summary-label">{t.marketValue}<span className="summary-symbol"><Wallet size={16} /></span></div><div className="summary-amount">{formatCurrency(balance, language)}</div><div className="summary-foot">{t.savingsAccounts}</div><div className="balance-art"><span /><span /><span /></div></article><article className="summary-card"><div className="summary-label">{t.savingsCount}<span className="summary-symbol income-symbol"><Landmark size={16} /></span></div><div className="summary-amount">{accounts.length}</div><div className="summary-foot">{t.assetsTracked}</div></article><article className="summary-card"><div className="summary-label">{t.savingsRate}<span className="summary-symbol savings-symbol"><TrendingUp size={16} /></span></div><div className="summary-amount">{formatRate(weightedRate, language)}</div><div className="summary-foot">{t.basedOnPrices}</div></article></section>
    <section className="panel manual-pricing-panel fixed-income-note"><span className="manual-pricing-icon"><Wallet size={18} /></span><div><strong>{t.savingsHeading}</strong><p>{t.savingsAccountNote}</p></div><span className="manual-pricing-tag">{language === 'pt' ? 'MENSAL' : 'MONTHLY'}</span></section>
    <section className="panel holdings-panel"><div className="transactions-heading"><div><h2>{t.savingsAccounts}</h2><p>{t.holdingsSubtitle}</p></div><button className="text-button" onClick={() => setShowModal(true)}><Plus size={15} /> {t.addSavingsAccount}</button></div>
      {accounts.length ? <div className="holdings-table-wrap"><table className="holdings-table savings-table"><thead><tr><th>{t.savingsAccountName}</th><th>{t.institution}</th><th>{t.marketValue}</th><th>{t.savingsTarget}</th><th>{t.savingsRate}</th><th>{t.history}</th><th /></tr></thead><tbody>{accounts.map((account) => { const targetProgress = account.target ? Math.max(0, Math.min(100, account.balance / account.target * 100)) : 0; return <tr key={account.id}><td><span className="holding-fund"><span className="holding-symbol"><Wallet size={15} /></span><span className="holding-name">{account.name}{account.isDemo && <i className="sample-chip">{t.sampleData}</i>}</span></span></td><td>{account.institution}</td><td className="holding-value">{formatCurrency(account.balance, language)}</td><td>{account.target ? <div className="savings-target-cell"><strong>{formatCurrency(account.target, language)}</strong><div><span style={{ width: `${targetProgress}%` }} /></div><small>{targetProgress.toFixed(0)}%</small></div> : 'â€”'}</td><td>{formatRate(account.annualRate, language)}</td><td><button className="history-table-button" onClick={() => setHistoryAccount(account)}>{account.history?.length || 0} {t.snapshots}</button></td><td><div className="transaction-actions"><button className="deposit-row" onClick={() => setDepositAccount(account)} aria-label={`${t.addMoney}: ${account.name}`} title={t.addMoney}><Plus size={15} /></button><button className="edit-row" onClick={() => setEditing(account)} aria-label={`${t.editSavingsAccount}: ${account.name}`} title={t.edit}><Pencil size={15} /></button><button className="delete-row" onClick={() => onDelete(account)} aria-label={`${t.removeRecord}: ${account.name}`} title={t.delete}><X size={15} /></button></div></td></tr> })}</tbody></table></div> : <div className="empty-transactions"><span className="empty-icon"><Wallet size={21} /></span><strong>{t.noSavings}</strong><p>{t.addFirstSavings}</p><button className="text-button" onClick={() => setShowModal(true)}><Plus size={15} /> {t.addSavingsAccount}</button></div>}
    </section>
    <footer className="page-footer"><span>{t.savingsAccountNote}</span><span>{t.footerMonth} <span className="footer-heart">â™¥</span></span></footer>
    {(showModal || editing) && <SavingsAccountModal language={language} account={editing} onClose={closeAccountModal} onSave={saveAccount} platforms={platforms} />}
    {depositAccount && <SavingsDepositModal language={language} account={depositAccount} onClose={() => setDepositAccount(null)} onDeposit={addDeposit} />}
    {historyAccount && <InvestmentHistoryModal language={language} kind="savings" record={historyAccount} onClose={() => setHistoryAccount(null)} onSave={(record) => { onSave(record); setHistoryAccount(null) }} />}
  </div>
}

function FireGoalModal({ language, goal, onClose, onSave }) {
  const t = messages[language]
  const [amount, setAmount] = useState(String(goal))
  const [error, setError] = useState('')
  function submit(event) {
    event.preventDefault()
    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) return setError(t.goalError)
    onSave(Number(amount))
  }
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="modal fire-goal-modal" role="dialog" aria-modal="true" aria-labelledby="fire-goal-modal-title">
    <div className="modal-top"><div><p className="eyebrow">{t.fireEyebrow}</p><h2 id="fire-goal-modal-title">{t.setFireGoal}</h2></div><button className="icon-button" onClick={onClose} aria-label={t.close}><X size={19} /></button></div>
    <form onSubmit={submit}><label className="field-label" htmlFor="fire-goal-amount">{t.goalAmount}</label><div className="amount-input"><span>â‚¬</span><input id="fire-goal-amount" autoFocus type="number" min="1" step="1000" value={amount} onChange={(event) => setAmount(event.target.value)} /></div>{error && <p className="form-error">{error}</p>}<button className="submit-button" type="submit"><Check size={17} /> {t.saveChanges}</button></form>
  </section></div>
}

function AnnualFlowChart({ transactions, year, language }) {
  const t = messages[language]
  const locale = language === 'pt' ? 'pt-PT' : 'en-IE'
  const months = Array.from({ length: 12 }, (_, index) => ({
    label: new Intl.DateTimeFormat(locale, { month: 'short' }).format(new Date(year, index, 1)),
    income: 0,
    expense: 0,
  }))
  transactions.forEach((item) => {
    if (Number(item.date.slice(0, 4)) === year) months[Number(item.date.slice(5, 7)) - 1][item.type] += item.amount
  })
  const peak = Math.max(1, ...months.flatMap((month) => [month.income, month.expense]))
  return <div className="annual-chart-wrap"><div className="chart-legend"><span><i className="legend-dot income-dot" /> {t.income}</span><span><i className="legend-dot expense-dot" /> {t.expenses}</span></div><svg className="annual-flow-chart" viewBox="0 0 720 225" role="img" aria-label={`${t.annualFlow} ${year}`}>
    {[40, 80, 120, 160].map((y) => <line key={y} x1="20" x2="700" y1={y} y2={y} className="grid-line" />)}
    {months.map((month, index) => { const x = 26 + index * 56; const incomeHeight = (month.income / peak) * 130; const expenseHeight = (month.expense / peak) * 130; return <g key={month.label}><rect x={x + 4} y={174 - incomeHeight} width="15" height={incomeHeight} rx="3" className="annual-income-bar" /><rect x={x + 22} y={174 - expenseHeight} width="15" height={expenseHeight} rx="3" className="annual-expense-bar" /><text x={x + 20} y="202" className="chart-label" textAnchor="middle">{month.label}</text></g> })}
  </svg></div>
}

function AnnualCategoryBreakdown({ transactions, year, language }) {
  const t = messages[language]
  const expenses = transactions.filter((item) => item.type === 'expense' && Number(item.date.slice(0, 4)) === year)
  const total = expenses.reduce((sum, item) => sum + item.amount, 0)
  const groups = expenses.reduce((result, item) => { const existing = result.find((group) => group.name === item.category); if (existing) existing.amount += item.amount; else result.push({ name: item.category, amount: item.amount, ...categoryInfo(item.category) }); return result }, []).sort((a, b) => b.amount - a.amount).slice(0, 5)
  let offset = 0
  const stops = groups.map((group) => { const start = offset; offset += total ? (group.amount / total) * 100 : 0; return `${group.color} ${start}% ${offset}%` })
  const background = total ? `conic-gradient(${stops.join(', ')})` : 'conic-gradient(#e9ede7 0% 100%)'
  return <article className="panel annual-categories-panel"><div className="panel-heading"><div><h2>{t.annualCategories}</h2><p>{t.annualCategoriesSubtitle}</p></div><span className="panel-icon"><Ellipsis size={18} /></span></div><div className="spending-breakdown annual-spending-breakdown"><div className="donut" style={{ background }}><div className="donut-hole"><span>{year}</span><strong>{formatCurrency(total, language)}</strong></div></div><div className="category-list">{groups.length ? groups.map((group) => <div className="category-row" key={group.name}><span className="category-name"><i style={{ background: group.color }} />{t.categoryNames[group.name] || group.name}</span><span>{formatCurrency(group.amount, language)}</span></div>) : <p className="empty-note">{t.noYearExpenses}</p>}</div></div></article>
}

function StatisticsPage({ language, transactions, onFillSample }) {
  const t = messages[language]
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
    <section className="insights-grid annual-insights"><article className="panel annual-flow-panel"><div className="panel-heading"><div><h2>{t.annualFlow}</h2><p>{t.annualFlowSubtitle}</p></div><span className="panel-icon"><ChartLine size={17} /></span></div><AnnualFlowChart transactions={yearTransactions} year={year} language={language} /></article><AnnualCategoryBreakdown transactions={yearTransactions} year={year} language={language} /></section>
    <div className="sample-data-note"><Sparkles size={14} /><span>{t.sampleInfo}</span></div>
    <footer className="page-footer"><span>{t.footer}</span><span>{t.footerMonth} <span className="footer-heart">â™¥</span></span></footer>
  </div>
}

function CashFlowChart({ transactions, selectedMonth, language }) {
  const t = messages[language]
  const weeks = useMemo(() => {
    const result = Array.from({ length: 5 }, (_, index) => ({ label: `${t.week} ${index + 1}`, income: 0, expense: 0 }))
    transactions.forEach((item) => {
      const week = Math.min(4, Math.floor((Number(item.date.slice(8, 10)) - 1) / 7))
      result[week][item.type] += item.amount
    })
    return result
  }, [transactions, t.week])
  const peak = Math.max(1, ...weeks.flatMap((week) => [week.income, week.expense]))
  const points = (key) => weeks.map((week, index) => `${36 + index * 112},${152 - (week[key] / peak) * 112}`).join(' ')
  const currentMonth = selectedMonth.getFullYear() === new Date().getFullYear() && selectedMonth.getMonth() === new Date().getMonth()
  const today = currentMonth ? Math.min(4, Math.floor((new Date().getDate() - 1) / 7)) : 4
  return (
    <div className="chart-wrap">
      <div className="chart-legend"><span><i className="legend-dot income-dot" /> {t.income}</span><span><i className="legend-dot expense-dot" /> {t.expenses}</span></div>
      <svg className="flow-chart" viewBox="0 0 512 190" role="img" aria-label={t.byWeek}>
        {[40, 80, 120, 160].map((y) => <line key={y} x1="30" x2="486" y1={y} y2={y} className="grid-line" />)}
        <polyline points={points('income')} className="chart-line income-line" />
        <polyline points={points('expense')} className="chart-line expense-line" />
        {weeks.map((week, index) => <g key={week.label}><circle cx={36 + index * 112} cy={152 - (week.income / peak) * 112} r="4" className="chart-point income-point" /><circle cx={36 + index * 112} cy={152 - (week.expense / peak) * 112} r="4" className="chart-point expense-point" /><text x={36 + index * 112} y="183" className="chart-label" textAnchor="middle">{week.label}</text></g>)}
        {currentMonth && <line x1={36 + today * 112} x2={36 + today * 112} y1="26" y2="159" className="today-line" />}
      </svg>
    </div>
  )
}

function SpendingBreakdown({ transactions, language }) {
  const t = messages[language]
  const expenses = transactions.filter((item) => item.type === 'expense')
  const total = expenses.reduce((sum, item) => sum + item.amount, 0)
  const groups = expenses.reduce((result, item) => {
    const existing = result.find((group) => group.name === item.category)
    if (existing) existing.amount += item.amount
    else result.push({ name: item.category, amount: item.amount, ...categoryInfo(item.category) })
    return result
  }, []).sort((a, b) => b.amount - a.amount).slice(0, 4)
  let offset = 0
  const stops = groups.map((group) => {
    const start = offset
    offset += total ? (group.amount / total) * 100 : 0
    return `${group.color} ${start}% ${offset}%`
  })
  const background = total ? `conic-gradient(${stops.join(', ')})` : 'conic-gradient(#e9ede7 0% 100%)'
  return (
    <div className="spending-breakdown">
      <div className="donut" style={{ background }}><div className="donut-hole"><span>{t.thisMonth}</span><strong>{formatCurrency(total, language)}</strong></div></div>
      <div className="category-list">{groups.length ? groups.map((group) => { const Icon = group.icon; return <div className="category-row" key={group.name}><span className="category-name"><i style={{ background: group.color }} /><Icon size={15} />{t.categoryNames[group.name]}</span><span>{formatCurrency(group.amount, language)}</span></div> }) : <p className="empty-note">{t.emptySpending}</p>}</div>
    </div>
  )
}

function PositionEvolutionChart({ timeline, language, range, visibility }) {
  const t = messages[language]
  const locale = language === 'pt' ? 'pt-PT' : 'en-IE'
  const visible = range === 'all' ? timeline : timeline.slice(-Number(range))
  const width = Math.max(760, visible.length * 56)
  const height = 260
  const plotTop = 28
  const plotBottom = 204
  const seriesKeys = ['position', 'cash', ...['etfs', 'crypto', 'p2p', 'bonds', 'savings'].filter((key) => visibility[key])]
  const allValues = visible.flatMap((point) => seriesKeys.map((key) => point[key]))
  const min = Math.min(0, ...allValues)
  const max = Math.max(1, ...allValues)
  const valueRange = max - min || 1
  const y = (value) => plotBottom - ((value - min) / valueRange) * (plotBottom - plotTop)
  const x = (index) => 34 + (index * (width - 68)) / Math.max(1, visible.length - 1)
  const series = [
    { key: 'position', label: t.globalPosition, color: '#315f48', width: 3 },
    { key: 'cash', label: t.seriesCash, color: '#91a47e', width: 2 },
    ...(visibility.etfs ? [{ key: 'etfs', label: t.seriesETFs, color: '#75ae88', width: 2 }] : []),
    ...(visibility.crypto ? [{ key: 'crypto', label: t.seriesCrypto, color: '#d4a94d', width: 2 }] : []),
    ...(visibility.p2p ? [{ key: 'p2p', label: t.seriesP2P, color: '#789bc2', width: 2 }] : []),
    ...(visibility.bonds ? [{ key: 'bonds', label: t.seriesBonds, color: '#a18bc0', width: 2 }] : []),
    ...(visibility.savings ? [{ key: 'savings', label: t.seriesSavings, color: '#df8f62', width: 2 }] : []),
  ]
  return <div className="position-chart-container"><div className="position-chart-legend">{series.map((item) => <span key={item.key}><i style={{ background: item.color }} />{item.label}</span>)}</div><div className="position-chart-scroll"><svg className="position-chart" style={{ width: `${width}px` }} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${t.positionHeading} Â· ${t.assetEvolution}`}>
    {[0, 1, 2, 3].map((step) => { const gridY = plotTop + step * ((plotBottom - plotTop) / 3); return <line key={step} x1="22" x2={width - 22} y1={gridY} y2={gridY} className="grid-line" /> })}
    {series.map((item) => { const points = visible.map((point, index) => `${x(index)},${y(point[item.key])}`).join(' '); return <polyline key={item.key} points={points} fill="none" stroke={item.color} strokeWidth={item.width} strokeLinecap="round" strokeLinejoin="round" className={item.key === 'position' ? 'position-total-line' : ''} /> })}
    {visible.map((point, index) => { const label = new Intl.DateTimeFormat(locale, { month: 'short', year: '2-digit' }).format(new Date(`${point.month}-01T12:00:00`)); return <text key={point.month} x={x(index)} y="239" className="chart-label" textAnchor="middle">{label}</text> })}
  </svg></div></div>
}

function GlobalPositionPage({ language, transactions, records, currentPosition, currentCash, visibility }) {
  const t = messages[language]
  const [range, setRange] = useState('12')
  const timeline = useMemo(() => buildPositionTimeline({ transactions, ...records, visibility }), [transactions, records, visibility])
  const current = timeline.at(-1) || { position: currentPosition, cash: currentCash, assets: 0, etfs: 0, crypto: 0, p2p: 0, bonds: 0, savings: 0 }
  const assetRows = [
    { key: 'etfs', label: t.etfs, value: current.etfs, tint: 'etf-tint', icon: <ChartLine size={16} /> },
    { key: 'crypto', label: t.crypto, value: current.crypto, tint: 'crypto-tint', icon: <Bitcoin size={16} /> },
    { key: 'p2p', label: t.p2p, value: current.p2p, tint: 'p2p-tint', icon: <HandCoins size={16} /> },
    { key: 'bonds', label: t.bonds, value: current.bonds, tint: 'bonds-tint', icon: <Landmark size={16} /> },
    { key: 'savings', label: t.savings, value: current.savings, tint: 'savings-tint', icon: <Wallet size={16} /> },
  ].filter((item) => visibility[item.key])
  const grossAssets = assetRows.reduce((sum, item) => sum + item.value, 0) + Math.max(0, current.cash)
  const ranges = [['3', t.period3], ['6', t.period6], ['12', t.period12], ['24', t.period24], ['all', t.periodAll]]

  return <div className="page-content global-position-page">
    <section className="welcome-row"><div><p className="eyebrow">{t.globalPosition}</p><h1>{t.positionHeading}<span>.</span></h1><p className="welcome-sub">{t.positionSubtitle}</p></div></section>
    <section className="position-summary-grid"><article className="position-summary-card position-total-card"><span>{t.totalPosition}</span><strong>{formatCurrency(current.position, language)}</strong><small>{t.fireEstimateNote}</small></article><article className="position-summary-card"><span>{t.trackedCash}</span><strong className={current.cash < 0 ? 'negative-return' : ''}>{formatCurrency(current.cash, language)}</strong></article><article className="position-summary-card"><span>{t.totalAssets}</span><strong>{formatCurrency(current.assets, language)}</strong></article></section>
    <section className="panel position-assets-panel"><div className="panel-heading"><div><h2>{t.currentAssets}</h2><p>{t.portfolioSummarySubtitle}</p></div><span className="panel-icon"><ChartLine size={17} /></span></div><div className="position-assets-grid">{assetRows.map((item) => { const share = grossAssets > 0 ? Math.max(0, (item.value / grossAssets) * 100) : 0; return <article className="position-asset-card" key={item.key}><div className="position-asset-label"><span className={`portfolio-mini-icon ${item.tint}`}>{item.icon}</span><span>{item.label}</span></div><strong>{formatCurrency(item.value, language)}</strong><div className="position-asset-bar"><span style={{ width: `${Math.min(100, share)}%` }} /></div><small>{share.toFixed(1)}% {t.of} {t.totalAssets.toLowerCase()}</small></article> })}</div></section>
    <section className="panel position-evolution-panel"><div className="position-evolution-heading"><div className="panel-heading"><div><h2>{t.assetEvolution}</h2><p>{t.assetEvolutionSubtitle}</p></div><span className="panel-icon"><TrendingUp size={17} /></span></div><div className="range-switch" role="group" aria-label={t.assetEvolution}>{ranges.map(([value, label]) => <button key={value} className={range === value ? 'range-option active-range' : 'range-option'} aria-pressed={range === value} onClick={() => setRange(value)}>{label}</button>)}</div></div><PositionEvolutionChart timeline={timeline} language={language} range={range} visibility={visibility} /></section>
    <footer className="page-footer"><span>{t.globalPositionNote}</span><span>{t.footerMonth} <span className="footer-heart">â™¥</span></span></footer>
  </div>
}

function Avatar({ profile, className = 'avatar' }) {
  if (profile?.avatar) return <span className={`${className} avatar-photo`} style={{ backgroundImage: `url(${profile.avatar})` }} role="img" aria-label={profile.name || 'Profile'} />
  return <span className={className}>{initialsForName(profile?.name || '')}</span>
}

function FireMeterCompact({ language, position, goal, onEdit }) {
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

function ProfilePage({ language, profile, visibility, onSaveProfile, onToggleVisibility }) {
  const t = messages[language]
  const locale = language === 'pt' ? 'pt-PT' : 'en-IE'
  const [name, setName] = useState(profile.name || '')
  const [photoError, setPhotoError] = useState('')
  const fileInput = useRef(null)
  const investmentTypes = [
    { key: 'etfs', label: t.etfs, icon: <ChartLine size={17} />, tint: 'etf-tint' },
    { key: 'crypto', label: t.crypto, icon: <Bitcoin size={17} />, tint: 'crypto-tint' },
    { key: 'p2p', label: t.p2p, icon: <HandCoins size={17} />, tint: 'p2p-tint' },
    { key: 'bonds', label: t.bonds, icon: <Landmark size={17} />, tint: 'bonds-tint' },
    { key: 'savings', label: t.savings, icon: <Wallet size={17} />, tint: 'savings-tint' },
  ]
  const createdAt = new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(new Date(`${profile.createdAt}T12:00:00`))

  function submit(event) {
    event.preventDefault()
    onSaveProfile({ ...profile, name: name.trim() })
  }

  async function uploadPhoto(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/') || file.size > 8 * 1024 * 1024) return setPhotoError(t.avatarFileError)
    try {
      const avatar = await resizeImageFile(file)
      setPhotoError('')
      onSaveProfile({ ...profile, name: name.trim(), avatar })
    } catch {
      setPhotoError(t.avatarReadError)
    }
  }

  function removePhoto() {
    setPhotoError('')
    onSaveProfile({ ...profile, name: name.trim(), avatar: '' })
  }

  return <div className="page-content profile-page">
    <section className="welcome-row"><div><p className="eyebrow">{t.account.toUpperCase()}</p><h1>{t.profileHeading}<span>.</span></h1><p className="welcome-sub">{t.profileSubtitle}</p></div></section>
    <section className="panel profile-card"><div className="profile-avatar-block"><button type="button" className="profile-avatar-button" onClick={() => fileInput.current?.click()} aria-label={profile.avatar ? t.changePhoto : t.uploadPhoto}><Avatar profile={profile} className="profile-avatar-large" /><span className="profile-avatar-overlay"><Camera size={18} /></span></button><input ref={fileInput} className="avatar-file-input" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={uploadPhoto} />{profile.avatar ? <button type="button" className="profile-photo-remove" onClick={removePhoto}>{t.removePhoto}</button> : <span className="profile-photo-hint">{t.uploadPhoto}</span>}{photoError && <p className="profile-photo-error">{photoError}</p>}</div><form className="profile-form" onSubmit={submit}><label className="field-label" htmlFor="profile-name">{t.yourName}</label><div className="profile-name-edit"><input id="profile-name" value={name} placeholder={t.namePlaceholder} maxLength={60} onChange={(event) => setName(event.target.value)} /><button className="primary-button" type="submit"><Check size={15} /> {t.saveProfile}</button></div></form><div className="profile-created"><span>{t.accountCreated}</span><strong>{createdAt}</strong></div></section>
    <section className="panel visibility-panel"><div className="panel-heading"><div><h2>{t.investmentSettings}</h2><p>{t.investmentSettingsSubtitle}</p></div><span className="panel-icon"><SlidersHorizontal size={17} /></span></div><div className="visibility-list">{investmentTypes.map((item) => <div className="visibility-row" key={item.key}><span className={`portfolio-mini-icon ${item.tint}`}>{item.icon}</span><div className="visibility-label"><strong>{item.label}</strong><span>{t.visibleSetting}</span></div><button type="button" className={visibility[item.key] ? 'visibility-switch switch-on' : 'visibility-switch'} role="switch" aria-checked={visibility[item.key]} aria-label={`${t.visibleSetting}: ${item.label}`} onClick={() => onToggleVisibility(item.key)}><span /></button></div>)}</div><p className="visibility-note">{t.hiddenAssetsNote}</p></section>
    <footer className="page-footer"><span>{t.footer}</span><span>{t.footerMonth} <span className="footer-heart">â™¥</span></span></footer>
  </div>
}

function AllTransactionsPage({ language, transactions, onAdd, onEdit, onDelete }) {
  const t = messages[language]
  const locale = language === 'pt' ? 'pt-PT' : 'en-IE'
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(20)
  const filtered = useMemo(() => transactions.filter((item) => {
    const matchesFilter = filter === 'all'
      || (filter === 'investment' ? ['Investment', 'Investments'].includes(item.category) : item.type === filter)
    const searchText = `${item.title} ${item.category} ${t.categoryNames[item.category] || ''} ${item.type} ${item.date} ${item.amount} ${item.platform || ''}`.toLowerCase()
    return matchesFilter && searchText.includes(query.toLowerCase())
  }).sort((a, b) => b.date.localeCompare(a.date)), [transactions, filter, query, t])
  const visible = filtered.slice(0, limit)
  const filters = [['all', t.allActivity], ['expense', t.expenses.charAt(0) + t.expenses.slice(1).toLowerCase()], ['income', t.income.charAt(0) + t.income.slice(1).toLowerCase()], ['investment', t.investmentActivity]]

  return <div className="page-content all-transactions-page">
    <section className="welcome-row"><div><p className="eyebrow">{t.transactions.toUpperCase()}</p><h1>{t.allTransactions}<span>.</span></h1><p className="welcome-sub">{t.allTransactionsSubtitle}</p></div><button className="primary-button" onClick={onAdd}><Plus size={18} /> {t.addTransaction}</button></section>
    <section className="panel transactions-panel all-transactions-panel"><div className="transaction-controls"><div className="filter-tabs" role="tablist" aria-label={t.transactions}>{filters.map(([value, label]) => <button key={value} role="tab" aria-selected={filter === value} className={filter === value ? 'filter-tab active-filter' : 'filter-tab'} onClick={() => { setFilter(value); setLimit(20) }}>{label}</button>)}</div><label className="search-box"><Search size={15} /><input aria-label={t.search} placeholder={t.search} value={query} onChange={(event) => { setQuery(event.target.value); setLimit(20) }} /></label></div>
      <div className="transaction-table"><div className="table-head"><span>{t.transaction}</span><span>{t.category}</span><span>{t.platform}</span><span>{t.date}</span><span>{t.amount}</span><span /></div>
        {visible.length ? visible.map((item) => { const info = categoryInfo(item.category, item.type); const typeLabel = item.type === 'income' ? t.income.charAt(0) + t.income.slice(1).toLowerCase() : t.expense; return <div className="transaction-row" key={item.id}><div className="transaction-main"><IconBadge icon={info.icon} color={info.color} /><div className="transaction-title"><button className="transaction-edit-trigger" onClick={() => onEdit(item)} aria-label={`${t.edit} ${item.title}`}>{item.title}</button><span>{typeLabel}{item.isDemo && <i className="sample-chip">{t.sampleData}</i>}</span><span className="transaction-platform-mobile">{item.platform || t.noPlatform}</span></div></div><span className="category-pill"><i style={{ background: info.color }} />{t.categoryNames[item.category] || item.category}</span><span className="platform-pill">{item.platform || 'â€”'}</span><span className="transaction-date">{formatDateTime(item.date, locale, true)}</span><span className={`transaction-amount ${item.type}`}>{item.type === 'income' ? '+' : 'âˆ’'}{formatCurrency(item.amount, language)}</span><div className="transaction-actions"><button className="edit-row" onClick={() => onEdit(item)} aria-label={`${t.edit} ${item.title}`} title={t.edit}><Pencil size={15} /></button><button className="delete-row" onClick={() => onDelete(item.id)} aria-label={`${t.delete} ${item.title}`} title={t.delete}><X size={15} /></button></div></div> }) : <div className="empty-transactions"><span className="empty-icon"><Coffee size={21} /></span><strong>{t.noTransactions}</strong><p>{t.trySearch}</p></div>}
      </div>
      <div className="all-transactions-footer"><span>{t.showing} <strong>{visible.length}</strong> {t.of} <strong>{filtered.length}</strong> {t.transactions.toLowerCase()}</span>{visible.length < filtered.length && <button className="text-button" onClick={() => setLimit((current) => current + 20)}>{t.loadMore} <ArrowDownLeft size={14} /></button>}</div>
    </section>
    <footer className="page-footer"><span>{t.footer}</span><span>{t.footerMonth} <span className="footer-heart">â™¥</span></span></footer>
  </div>
}

function App() {
  const [transactions, setTransactions] = useState(loadTransactions)
  const [holdings, setHoldings] = useState(loadInvestments)
  const [cryptoHoldings, setCryptoHoldings] = useState(loadCrypto)
  const [p2pRecords, setP2PRecords] = useState(loadP2P)
  const [bondHoldings, setBondHoldings] = useState(loadBonds)
  const [savingsAccounts, setSavingsAccounts] = useState(loadSavingsAccounts)
  const [platforms, setPlatforms] = useState(loadPlatforms)
  const [customCategories, setCustomCategories] = useState(loadCustomCategories)
  const [fireGoal, setFireGoal] = useState(loadFireGoal)
  const [showFireGoalModal, setShowFireGoalModal] = useState(false)
  const [profile, setProfile] = useState(loadUserProfile)
  const [investmentVisibility, setInvestmentVisibility] = useState(loadInvestmentVisibility)
  const [activePage, setActivePage] = useState('overview')
  const [activeMobileTab, setActiveMobileTab] = useState('overview')
  const [language, setLanguage] = useState(() => {
    try { return localStorage.getItem(LANGUAGE_KEY) === 'pt' ? 'pt' : 'en' } catch { return 'en' }
  })
  const [selectedMonth, setSelectedMonth] = useState(() => dateForMonth(new Date()))
  const [showModal, setShowModal] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState(null)

  const monthlyTransactions = useMemo(() => transactions.filter((item) => item.date.startsWith(monthKey(selectedMonth))), [transactions, selectedMonth])
  const totals = useMemo(() => monthlyTransactions.reduce((result, item) => { result[item.type] += item.amount; return result }, { income: 0, expense: 0 }), [monthlyTransactions])
  const net = totals.income - totals.expense
  const monthlyInvested = monthlyTransactions.filter((item) => item.type === 'expense' && ['Investment', 'Investments'].includes(item.category)).reduce((sum, item) => sum + item.amount, 0)
  const monthlySavingsDeposits = monthlyTransactions.filter((item) => item.type === 'expense' && item.category === 'Savings').reduce((sum, item) => sum + item.amount, 0)
  const cashSavedThisMonth = net + monthlySavingsDeposits
  const totalSavedThisMonth = cashSavedThisMonth + monthlyInvested
  const lifetimeIncome = transactions.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0)
  const lifetimeExpenses = transactions.filter((item) => item.type === 'expense').reduce((sum, item) => {
    if (!['Investment', 'Investments'].includes(item.category)) return sum + item.amount
    const type = investmentTypeFromTransaction(item)
    return type && investmentVisibility[type] ? sum : sum + item.amount
  }, 0)
  const ETFInvested = investmentVisibility.etfs ? holdings.reduce((sum, holding) => sum + holding.units * holding.averageCost, 0) : 0
  const ETFMarketValue = investmentVisibility.etfs ? holdings.reduce((sum, holding) => sum + holding.units * holding.currentPrice, 0) : 0
  const cryptoInvested = investmentVisibility.crypto ? cryptoHoldings.reduce((sum, holding) => sum + holding.units * holding.averageCost, 0) : 0
  const cryptoMarketValue = investmentVisibility.crypto ? cryptoHoldings.reduce((sum, holding) => sum + holding.units * holding.currentPrice, 0) : 0
  const p2pInvested = investmentVisibility.p2p ? p2pRecords.reduce((sum, record) => sum + record.invested, 0) : 0
  const p2pMarketValue = investmentVisibility.p2p ? p2pRecords.reduce((sum, record) => sum + record.currentValue, 0) : 0
  const bondsInvested = investmentVisibility.bonds ? bondHoldings.reduce((sum, record) => sum + record.investedValue, 0) : 0
  const bondsMarketValue = investmentVisibility.bonds ? bondHoldings.reduce((sum, record) => sum + record.currentValue, 0) : 0
  const totalSavingsBalance = investmentVisibility.savings ? savingsAccounts.reduce((sum, account) => sum + account.balance, 0) : 0
  const totalInvested = ETFInvested + cryptoInvested + p2pInvested + bondsInvested
  const totalPortfolioValue = ETFMarketValue + cryptoMarketValue + p2pMarketValue + bondsMarketValue + totalSavingsBalance
  const trackedCash = lifetimeIncome - lifetimeExpenses - totalInvested
  const globalPosition = trackedCash + totalPortfolioValue
  const savings = totals.income ? (totalSavedThisMonth / totals.income) * 100 : 0
  const recentTransactions = useMemo(() => [...monthlyTransactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5), [monthlyTransactions])
  const t = messages[language]
  const locale = language === 'pt' ? 'pt-PT' : 'en-IE'
  const monthTitle = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(selectedMonth)
  const today = new Date()

  useEffect(() => {
    document.documentElement.lang = locale
    document.title = language === 'pt' ? 'Firepath â€” o teu caminho para a independÃªncia financeira' : 'Firepath â€” your path to financial independence'
  }, [language, locale])

  function saveFireGoal(nextGoal) {
    setFireGoal(nextGoal)
    localStorage.setItem(FIRE_GOAL_STORAGE_KEY, String(nextGoal))
    setShowFireGoalModal(false)
  }

  function saveUserProfile(nextProfile) {
    setProfile(nextProfile)
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(nextProfile))
  }

  function toggleInvestmentVisibility(type) {
    const next = { ...investmentVisibility, [type]: !investmentVisibility[type] }
    setInvestmentVisibility(next)
    localStorage.setItem(VISIBILITY_STORAGE_KEY, JSON.stringify(next))
  }

  useEffect(() => {
    const recordsByType = {
      etfs: holdings,
      crypto: cryptoHoldings,
      p2p: p2pRecords,
      bonds: bondHoldings,
    }
    let changed = false
    const next = transactions.map((transaction) => {
      if (transaction.sourceType === 'savings') {
        const account = savingsAccounts.find((item) => item.id === transaction.sourceId)
        const platform = account?.institution || 'Bank account'
        if (transaction.platform !== platform) {
          changed = true
          return { ...transaction, platform }
        }
        return transaction
      }
      if (transaction.sourceType !== 'portfolio') {
        if (!transaction.platform && transaction.isDemo) {
          const investmentPlatform = transaction.category === 'Investment' && transaction.title.toLowerCase().includes('bond') ? 'Banco Invest' : transaction.category === 'Investment' ? 'Trade Republic' : 'Bank account'
          changed = true
          return { ...transaction, platform: investmentPlatform }
        }
        return transaction
      }
      const type = transaction.investmentType || Object.keys(recordsByType).find((key) => transaction.id.startsWith(`portfolio-flow-${key}-`))
      const record = recordsByType[type]?.find((item) => item.id === transaction.sourceId)
      if (!type || !record) return transaction
      const detail = type === 'etfs' || type === 'crypto' ? record.symbol : record.name
      const purchaseLabel = type === 'etfs' ? t.etfPurchase : type === 'crypto' ? t.cryptoPurchase : type === 'p2p' ? t.p2pPurchase : t.bondPurchase
      const saleLabel = type === 'etfs' ? t.etfSale : type === 'crypto' ? t.cryptoSale : type === 'p2p' ? t.p2pSale : t.bondSale
      const title = `${(transaction.flowDelta ?? (transaction.type === 'expense' ? 1 : -1)) > 0 ? purchaseLabel : saleLabel} Â· ${detail}`
      const platform = record.platform || (type === 'etfs' ? 'Trade Republic' : type === 'crypto' ? 'Coinbase' : type === 'p2p' ? 'Mintos' : 'Banco Invest')
      if (transaction.title === title && transaction.investmentType === type && transaction.platform === platform) return transaction
      changed = true
      return { ...transaction, title, investmentType: type, platform }
    })
    if (changed) {
      setTransactions(next)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    }
  }, [transactions, holdings, cryptoHoldings, p2pRecords, bondHoldings, savingsAccounts, t])

  function save(next) {
    setTransactions(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  function rememberPlatform(value) {
    const platform = value?.trim()
    if (!platform || platforms.some((item) => item.toLowerCase() === platform.toLowerCase())) return
    const next = [...platforms, platform]
    setPlatforms(next)
    localStorage.setItem(PLATFORMS_STORAGE_KEY, JSON.stringify(next))
  }

  function rememberCategory(type, value) {
    const category = value?.trim()
    if (!category || categories[type].some((item) => item.name.toLowerCase() === category.toLowerCase()) || customCategories[type].some((item) => item.toLowerCase() === category.toLowerCase())) return
    const next = { ...customCategories, [type]: [...customCategories[type], category] }
    setCustomCategories(next)
    localStorage.setItem(CUSTOM_CATEGORIES_STORAGE_KEY, JSON.stringify(next))
  }

  function savePortfolioRecord(type, record, captureCurrent = true) {
    rememberPlatform(record.platform)
    let savedRecord = record
    if (captureCurrent) {
      const month = monthKey(new Date())
      const value = assetMarketValue(record, type)
      const history = [...(record.history || []).filter((item) => item.month !== month), { month, value, invested: portfolioCostBasis(record, type) }].sort((a, b) => a.month.localeCompare(b.month))
      savedRecord = { ...record, history }
    }
    const config = type === 'etfs'
      ? { records: holdings, setter: setHoldings, key: INVESTMENT_STORAGE_KEY }
      : type === 'crypto'
        ? { records: cryptoHoldings, setter: setCryptoHoldings, key: CRYPTO_STORAGE_KEY }
        : type === 'p2p'
          ? { records: p2pRecords, setter: setP2PRecords, key: P2P_STORAGE_KEY }
          : { records: bondHoldings, setter: setBondHoldings, key: BONDS_STORAGE_KEY }
    const previousRecord = config.records.find((item) => item.id === savedRecord.id)
    const delta = portfolioCostBasis(savedRecord, type) - (previousRecord ? portfolioCostBasis(previousRecord, type) : 0)
    const exists = Boolean(previousRecord)
    const next = exists ? config.records.map((item) => item.id === savedRecord.id ? savedRecord : item) : [...config.records, savedRecord]
    config.setter(next)
    localStorage.setItem(config.key, JSON.stringify(next))
    if (Math.abs(delta) >= 0.005) {
      const month = monthKey(new Date())
      const sourceId = `portfolio-flow-${type}-${savedRecord.id}-${month}`
      const priorFlow = transactions.find((item) => item.id === sourceId)?.flowDelta || 0
      const flowDelta = priorFlow + delta
      const nextTransactions = transactions.filter((item) => item.id !== sourceId)
      if (Math.abs(flowDelta) >= 0.005) {
        const detail = type === 'etfs' || type === 'crypto' ? savedRecord.symbol : savedRecord.name
        const flowLabel = type === 'etfs' ? (flowDelta > 0 ? t.etfPurchase : t.etfSale) : type === 'crypto' ? (flowDelta > 0 ? t.cryptoPurchase : t.cryptoSale) : type === 'p2p' ? (flowDelta > 0 ? t.p2pPurchase : t.p2pSale) : (flowDelta > 0 ? t.bondPurchase : t.bondSale)
        const title = `${flowLabel} Â· ${detail}`
        nextTransactions.push({ id: sourceId, title, category: 'Investment', type: flowDelta > 0 ? 'expense' : 'income', amount: Math.abs(flowDelta), date: timeStamp(new Date()), platform: savedRecord.platform || '', sourceType: 'portfolio', sourceId: savedRecord.id, investmentType: type, flowDelta })
      }
      save(nextTransactions)
    }
  }

  function saveSavingsAccounts(next) {
    setSavingsAccounts(next)
    localStorage.setItem(SAVINGS_STORAGE_KEY, JSON.stringify(next))
  }

  function saveSavingsAccount(account) {
    rememberPlatform(account.institution)
    rememberPlatform(account.institution)
    const previous = savingsAccounts.find((item) => item.id === account.id)
    const delta = account.balance - (previous?.balance || 0)
    const month = monthKey(new Date())
    const history = [...(account.history || []).filter((item) => item.month !== month), { month, value: account.balance }].sort((a, b) => a.month.localeCompare(b.month))
    const savedAccount = { ...account, history }
    const nextAccounts = previous ? savingsAccounts.map((item) => item.id === account.id ? savedAccount : item) : [...savingsAccounts, savedAccount]
    saveSavingsAccounts(nextAccounts)
    if (Math.abs(delta) >= 0.005) {
      const sourceId = `savings-flow-${account.id}-${month}`
      const priorFlow = transactions.find((item) => item.id === sourceId)?.flowDelta || 0
      const flowDelta = priorFlow + delta
      const nextTransactions = transactions.filter((item) => item.id !== sourceId)
      if (Math.abs(flowDelta) >= 0.005) nextTransactions.push({ id: sourceId, title: `${flowDelta > 0 ? t.savingsDepositTitle : t.savingsWithdrawalTitle} Â· ${account.name}`, category: 'Savings', type: flowDelta > 0 ? 'expense' : 'income', amount: Math.abs(flowDelta), date: timeStamp(new Date()), platform: account.institution || '', sourceType: 'savings', sourceId: account.id, flowDelta })
      save(nextTransactions)
    }
  }

  function removePortfolioRecord(type, id) {
    const config = type === 'etfs'
      ? { records: holdings, setter: setHoldings, key: INVESTMENT_STORAGE_KEY }
      : type === 'crypto'
        ? { records: cryptoHoldings, setter: setCryptoHoldings, key: CRYPTO_STORAGE_KEY }
        : type === 'p2p'
          ? { records: p2pRecords, setter: setP2PRecords, key: P2P_STORAGE_KEY }
          : { records: bondHoldings, setter: setBondHoldings, key: BONDS_STORAGE_KEY }
    const next = config.records.filter((item) => item.id !== id)
    config.setter(next)
    localStorage.setItem(config.key, JSON.stringify(next))
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

  function fillSampleHistory() {
    const samples = demoTransactionsForEmptyMonths(transactions)
    if (samples.length) save([...transactions, ...samples])
  }

  function selectTransactions(event) {
    event?.preventDefault()
    setActivePage('transactions')
    setActiveMobileTab('transactions')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function changeLanguage(nextLanguage) {
    setLanguage(nextLanguage)
    try { localStorage.setItem(LANGUAGE_KEY, nextLanguage) } catch { /* Language still applies for this session. */ }
  }

  function saveTransaction(transaction) {
    rememberPlatform(transaction.platform)
    rememberCategory(transaction.type, transaction.category)
    rememberPlatform(transaction.platform)
    rememberCategory(transaction.type, transaction.category)
    const exists = transactions.some((item) => item.id === transaction.id)
    save(exists ? transactions.map((item) => item.id === transaction.id ? transaction : item) : [...transactions, transaction])
    setShowModal(false)
    setEditingTransaction(null)
  }

  function closeModal() {
    setShowModal(false)
    setEditingTransaction(null)
  }

  function removeTransaction(id) {
    save(transactions.filter((item) => item.id !== id))
  }

  function shiftMonth(amount) {
    setSelectedMonth((month) => new Date(month.getFullYear(), month.getMonth() + amount, 1))
  }

  return (
    <div className="app-shell" lang={locale}>
      <aside className="sidebar" data-space-label={language === 'pt' ? 'AS TUAS FINANÃ‡AS' : 'YOUR MONEY'}>
        <a className="brand" href="#overview" aria-label="Firepath home"><span className="brand-mark"><Flame size={18} fill="currentColor" /></span><span>firepath<span className="brand-period">.</span></span></a>
        <div className="side-caption">{t.yourSpace.toUpperCase()}</div>
        <a className={activePage === 'overview' ? 'nav-link active' : 'nav-link'} href="#overview" onClick={(event) => { event.preventDefault(); selectOverview() }}><span className="nav-icon"><Wallet size={18} /></span>{t.overview}</a>
        <a className={activePage === 'position' ? 'nav-link active' : 'nav-link'} href="#position" onClick={(event) => { event.preventDefault(); selectGlobalPosition() }}><span className="nav-icon"><ChartLine size={18} /></span>{t.position}</a>
        <a className={activePage === 'transactions' ? 'nav-link active' : 'nav-link'} href="#all-transactions" onClick={selectTransactions}><span className="nav-icon"><ReceiptText size={18} /></span>{t.transactions}</a>
        {investmentVisibility.etfs && <a className={activePage === 'etfs' ? 'nav-link active' : 'nav-link'} href="#etfs" onClick={(event) => { event.preventDefault(); selectPortfolioPage('etfs') }}><span className="nav-icon"><ChartLine size={18} /></span>{t.etfs}</a>}
        {investmentVisibility.crypto && <a className={activePage === 'crypto' ? 'nav-link active' : 'nav-link'} href="#crypto" onClick={(event) => { event.preventDefault(); selectPortfolioPage('crypto') }}><span className="nav-icon"><Bitcoin size={18} /></span>{t.crypto}</a>}
        {investmentVisibility.p2p && <a className={activePage === 'p2p' ? 'nav-link active' : 'nav-link'} href="#p2p" onClick={(event) => { event.preventDefault(); selectPortfolioPage('p2p') }}><span className="nav-icon"><HandCoins size={18} /></span>{t.p2p}</a>}
        {investmentVisibility.bonds && <a className={activePage === 'bonds' ? 'nav-link active' : 'nav-link'} href="#bonds" onClick={(event) => { event.preventDefault(); selectPortfolioPage('bonds') }}><span className="nav-icon"><Landmark size={18} /></span>{t.bonds}</a>}
        {investmentVisibility.savings && <a className={activePage === 'savings' ? 'nav-link active' : 'nav-link'} href="#savings" onClick={(event) => { event.preventDefault(); selectPortfolioPage('savings') }}><span className="nav-icon"><Wallet size={18} /></span>{t.savings}</a>}
        <a className={activePage === 'statistics' ? 'nav-link active' : 'nav-link'} href="#statistics" onClick={(event) => { event.preventDefault(); selectStatistics() }}><span className="nav-icon"><CalendarDays size={18} /></span>{t.statistics}</a>
        <div className="sidebar-bottom"><FireMeterCompact language={language} position={globalPosition} goal={fireGoal} onEdit={() => setShowFireGoalModal(true)} /><button className="help-link" type="button"><CircleHelp size={17} /> {t.help}</button><div className="profile"><button className={activePage === 'profile' ? 'profile-button active-profile' : 'profile-button'} type="button" onClick={selectProfilePage}><Avatar profile={profile} /><div className="profile-meta"><strong>{profile.name || t.account}</strong><span>{t.profile}</span></div><Ellipsis size={18} className="profile-more" /></button></div></div>
      </aside>

      <nav className="mobile-nav" aria-label={t.yourSpace}>
        <button className={activeMobileTab === 'overview' ? 'mobile-nav-link active-mobile-nav' : 'mobile-nav-link'} onClick={selectOverview}><Wallet size={15} />{t.overview}</button>
        <button className={activeMobileTab === 'position' ? 'mobile-nav-link active-mobile-nav' : 'mobile-nav-link'} onClick={selectGlobalPosition}><ChartLine size={15} />{t.position}</button>
        <button className={activeMobileTab === 'transactions' ? 'mobile-nav-link active-mobile-nav' : 'mobile-nav-link'} onClick={selectTransactions}><ReceiptText size={15} />{t.transactions}</button>
        {investmentVisibility.etfs && <button className={activeMobileTab === 'etfs' ? 'mobile-nav-link active-mobile-nav' : 'mobile-nav-link'} onClick={() => selectPortfolioPage('etfs')}><ChartLine size={15} />{t.etfs}</button>}
        {investmentVisibility.crypto && <button className={activeMobileTab === 'crypto' ? 'mobile-nav-link active-mobile-nav' : 'mobile-nav-link'} onClick={() => selectPortfolioPage('crypto')}><Bitcoin size={15} />{t.crypto}</button>}
        {investmentVisibility.p2p && <button className={activeMobileTab === 'p2p' ? 'mobile-nav-link active-mobile-nav' : 'mobile-nav-link'} onClick={() => selectPortfolioPage('p2p')}><HandCoins size={15} />{t.p2p}</button>}
        {investmentVisibility.bonds && <button className={activeMobileTab === 'bonds' ? 'mobile-nav-link active-mobile-nav' : 'mobile-nav-link'} onClick={() => selectPortfolioPage('bonds')}><Landmark size={15} />{t.bonds}</button>}
        {investmentVisibility.savings && <button className={activeMobileTab === 'savings' ? 'mobile-nav-link active-mobile-nav' : 'mobile-nav-link'} onClick={() => selectPortfolioPage('savings')}><Wallet size={15} />{t.savings}</button>}
        <button className={activeMobileTab === 'profile' ? 'mobile-nav-link active-mobile-nav' : 'mobile-nav-link'} onClick={selectProfilePage}><UserRound size={15} />{t.profile}</button>
        <button className={activeMobileTab === 'statistics' ? 'mobile-nav-link active-mobile-nav' : 'mobile-nav-link'} onClick={selectStatistics}><CalendarDays size={15} />{t.statistics}</button>
      </nav>

      <main className="main-content" id="overview">
        <header className="topbar"><div className="breadcrumb">{t.yourSpace} <span>/</span> <strong>{t[activePage] || t.overview}</strong></div><div className="topbar-right"><div className="language-switch" role="group" aria-label={t.language}><button type="button" className={language === 'en' ? 'language-option selected-language' : 'language-option'} aria-label="English" aria-pressed={language === 'en'} onClick={() => changeLanguage('en')}>EN</button><button type="button" className={language === 'pt' ? 'language-option selected-language' : 'language-option'} aria-label="PortuguÃªs (Portugal)" title="PortuguÃªs (Portugal)" aria-pressed={language === 'pt'} onClick={() => changeLanguage('pt')}>PT-PT</button></div><span className="today-label"><span className="online-dot" />{t.saved}</span><Avatar profile={profile} className="top-avatar" /></div></header>
        {activePage === 'profile' ? <ProfilePage language={language} profile={profile} visibility={investmentVisibility} onSaveProfile={saveUserProfile} onToggleVisibility={toggleInvestmentVisibility} /> : activePage === 'position' ? <GlobalPositionPage language={language} transactions={transactions} records={{ etfs: investmentVisibility.etfs ? holdings : [], crypto: investmentVisibility.crypto ? cryptoHoldings : [], p2p: investmentVisibility.p2p ? p2pRecords : [], bonds: investmentVisibility.bonds ? bondHoldings : [], savings: investmentVisibility.savings ? savingsAccounts : [] }} visibility={investmentVisibility} currentPosition={globalPosition} currentCash={trackedCash} /> : activePage === 'transactions' ? <AllTransactionsPage language={language} transactions={transactions} onAdd={() => setShowModal(true)} onEdit={setEditingTransaction} onDelete={removeTransaction} /> : activePage === 'etfs' || activePage === 'crypto' ? <InvestmentsPage language={language} holdings={activePage === 'etfs' ? holdings : cryptoHoldings} assetType={activePage === 'etfs' ? 'etf' : 'crypto'} platforms={platforms} onSave={(record, captureCurrent) => savePortfolioRecord(activePage, record, captureCurrent)} onDelete={(id) => removePortfolioRecord(activePage, id)} /> : activePage === 'p2p' || activePage === 'bonds' ? <FixedIncomePage language={language} kind={activePage} records={activePage === 'p2p' ? p2pRecords : bondHoldings} platforms={platforms} onSave={(record, captureCurrent) => savePortfolioRecord(activePage, record, captureCurrent)} onDelete={(id) => removePortfolioRecord(activePage, id)} /> : activePage === 'savings' ? <SavingsPage language={language} accounts={savingsAccounts} platforms={platforms} onSave={saveSavingsAccount} onDelete={(account) => saveSavingsAccounts(savingsAccounts.filter((item) => item.id !== account.id))} /> : activePage === 'statistics' ? <StatisticsPage language={language} transactions={transactions} onFillSample={fillSampleHistory} /> : <div className="page-content">
          <section className="welcome-row"><div><p className="eyebrow">{t.snapshot}</p><h1>{t.headline}<span>.</span></h1><p className="welcome-sub">{t.welcome}</p></div><button className="primary-button" onClick={() => setShowModal(true)}><Plus size={18} strokeWidth={2.4} /> {t.addTransaction}</button></section>

          <section className="global-position-panel" aria-label={t.globalPosition}>
            <div className="global-position-feature"><span className="global-position-icon"><ChartLine size={18} /></span><p className="global-position-label">{t.globalPosition}</p><strong>{formatCurrency(globalPosition, language)}</strong><span className="global-position-caption">{t.globalPositionSubtitle}</span></div>
            <div className="global-position-details"><div className="global-breakdown"><div><span>{t.trackedCash}</span><strong className={trackedCash < 0 ? 'negative-return' : ''}>{formatCurrency(trackedCash, language)}</strong></div><div><span>{t.globalETFValue}</span><strong>{formatCurrency(totalPortfolioValue, language)}</strong></div><button className="text-button" onClick={() => selectPortfolioPage('etfs')}><ChartLine size={15} /> {t.viewInvestments}<ArrowRight size={14} /></button></div><p className="global-position-note">{t.globalPositionNote}</p></div>
          </section>

          <div className="fire-compact-mobile"><FireMeterCompact language={language} position={globalPosition} goal={fireGoal} onEdit={() => setShowFireGoalModal(true)} /></div>

          <section className="portfolio-overview"><div className="overview-section-heading"><h2>{t.portfolioSummary}</h2><p>{t.portfolioSummarySubtitle}</p></div><div className="portfolio-mini-grid">
            {[
              { page: 'etfs', label: t.etfs, value: ETFMarketValue, invested: ETFInvested, count: holdings.length, icon: <ChartLine size={16} />, tint: 'etf-tint' },
              { page: 'crypto', label: t.crypto, value: cryptoMarketValue, invested: cryptoInvested, count: cryptoHoldings.length, icon: <Bitcoin size={16} />, tint: 'crypto-tint' },
              { page: 'p2p', label: t.p2p, value: p2pMarketValue, invested: p2pInvested, count: p2pRecords.length, icon: <HandCoins size={16} />, tint: 'p2p-tint' },
              { page: 'bonds', label: t.bonds, value: bondsMarketValue, invested: bondsInvested, count: bondHoldings.length, icon: <Landmark size={16} />, tint: 'bonds-tint' },
              { page: 'savings', label: t.savings, value: totalSavingsBalance, invested: totalSavingsBalance, count: savingsAccounts.length, icon: <Wallet size={16} />, tint: 'savings-tint', detail: t.currentBalance },
            ].filter((item) => investmentVisibility[item.page]).map((item) => <button className="portfolio-mini-card" key={item.page} onClick={() => selectPortfolioPage(item.page)}><span className={`portfolio-mini-icon ${item.tint}`}>{item.icon}</span><span className="portfolio-mini-title">{item.label}<ArrowRight size={13} /></span><strong>{formatCurrency(item.value, language)}</strong><span className="portfolio-mini-foot">{item.count} {t.items} Â· {formatCurrency(item.invested, language)} {item.detail || t.invested}</span></button>)}
          </div></section>

          <section className="month-toolbar" aria-label={t.selectMonth}><div className="month-nav"><button className="month-arrow" onClick={() => shiftMonth(-1)} aria-label={t.previousMonth}><ArrowLeft size={17} /></button><div className="month-heading"><CalendarDays size={17} /><strong>{monthTitle}</strong></div><button className="month-arrow" onClick={() => shiftMonth(1)} aria-label={t.nextMonth}><ArrowRight size={17} /></button></div><button className="today-button" onClick={() => setSelectedMonth(dateForMonth(today))}>{t.today}</button></section>

          <section className="summary-grid" aria-label={t.monthlySummary}>
            <article className="summary-card balance-card"><div className="summary-label">{t.balance}<span className="summary-symbol"><Wallet size={16} /></span></div><div className="summary-amount">{formatCurrency(cashSavedThisMonth, language)}</div><div className="summary-foot"><span className="trend-chip"><TrendingUp size={13} /> {savings.toFixed(0)}%</span><span>{t.cashSavedCaption}</span></div><div className="balance-art"><span /><span /><span /></div></article>
            <article className="summary-card"><div className="summary-label">{t.income}<span className="summary-symbol income-symbol"><ArrowDownLeft size={16} /></span></div><div className="summary-amount">{formatCurrency(totals.income, language)}</div><div className="summary-foot"><span className="mini-dot income-mini" />{t.moneyIn}</div><div className="card-progress"><span className="income-progress" style={{ width: `${totals.income ? Math.min(100, (totals.income / Math.max(totals.income, totals.expense)) * 100) : 0}%` }} /></div></article>
            <article className="summary-card"><div className="summary-label">{t.expenses}<span className="summary-symbol expense-symbol"><ArrowUpRight size={16} /></span></div><div className="summary-amount">{formatCurrency(totals.expense, language)}</div><div className="summary-foot"><span className="mini-dot expense-mini" />{t.moneyOut}</div><div className="card-progress"><span className="expense-progress" style={{ width: `${totals.expense ? Math.min(100, (totals.expense / Math.max(totals.income, totals.expense)) * 100) : 0}%` }} /></div></article>
            <article className="summary-card"><div className="summary-label">{t.savingRate}<span className="summary-symbol savings-symbol"><Sparkles size={15} /></span></div><div className="summary-amount">{savings.toFixed(0)}<span className="percent">%</span></div><div className="summary-foot savings-breakdown-foot"><span>{t.cashSavedBreakdown}: {formatCurrency(cashSavedThisMonth, language)}</span><span>{t.investedBreakdown}: {formatCurrency(monthlyInvested, language)}</span></div><div className="card-progress"><span className="savings-progress" style={{ width: `${Math.max(0, Math.min(100, savings))}%` }} /></div></article>
          </section>

          <section className="insights-grid"><article className="panel cashflow-panel"><div className="panel-heading"><div><h2>{t.cashFlow}</h2><p>{t.byWeek}</p></div><span className="panel-icon"><TrendingUp size={17} /></span></div><CashFlowChart transactions={monthlyTransactions} selectedMonth={selectedMonth} language={language} /></article><article className="panel spending-panel"><div className="panel-heading"><div><h2>{t.whereItGoes}</h2><p>{t.spendingBreakdown}</p></div><span className="panel-icon"><Ellipsis size={18} /></span></div><SpendingBreakdown transactions={monthlyTransactions} language={language} /></article></section>

          <section className="panel transactions-panel" id="transactions"><div className="transactions-heading"><div><h2>{t.recent}</h2><p>{t.moneyComingGoing}</p></div><div className="transactions-heading-actions"><button className="text-button" onClick={() => setShowModal(true)}><Plus size={15} /> {t.addNew}</button><button className="view-all-button" onClick={selectTransactions}>{t.viewAll} <ArrowRight size={14} /></button></div></div>
            <div className="transaction-table"><div className="table-head"><span>{t.transaction}</span><span>{t.category}</span><span>{t.platform}</span><span>{t.date.toUpperCase()}</span><span>{t.amount}</span><span /></div>
              {recentTransactions.length ? recentTransactions.map((item) => { const info = categoryInfo(item.category, item.type); const typeLabel = item.type === 'income' ? t.income.charAt(0) + t.income.slice(1).toLowerCase() : t.expense; return <div className="transaction-row" key={item.id}><div className="transaction-main"><IconBadge icon={info.icon} color={info.color} /><div className="transaction-title"><button className="transaction-edit-trigger" onClick={() => setEditingTransaction(item)} aria-label={`${t.edit} ${item.title}`}>{item.title}</button><span>{typeLabel}{item.isDemo && <i className="sample-chip">{t.sampleData}</i>}</span><span className="transaction-platform-mobile">{item.platform || t.noPlatform}</span></div></div><span className="category-pill"><i style={{ background: info.color }} />{t.categoryNames[item.category] || item.category}</span><span className="platform-pill">{item.platform || t.noPlatform}</span><span className="transaction-date">{formatDateTime(item.date, locale)}</span><span className={`transaction-amount ${item.type}`}>{item.type === 'income' ? '+' : 'âˆ’'}{formatCurrency(item.amount, language)}</span><div className="transaction-actions"><button className="edit-row" onClick={() => setEditingTransaction(item)} aria-label={`${t.edit} ${item.title}`} title={t.edit}><Pencil size={15} /></button><button className="delete-row" onClick={() => removeTransaction(item.id)} aria-label={`${t.delete} ${item.title}`} title={t.delete}><X size={15} /></button></div></div> }) : <div className="empty-transactions"><span className="empty-icon"><Coffee size={21} /></span><strong>{t.freshStart}</strong><p>{t.firstTransaction}</p><button className="text-button" onClick={() => setShowModal(true)}><Plus size={15} /> {t.addATransaction}</button></div>}
            </div>
            {recentTransactions.length > 0 && <div className="table-footer"><span>{t.showing} <strong>{recentTransactions.length}</strong> {t.of} <strong>{monthlyTransactions.length}</strong> {t.transactions.toLowerCase()}</span><span className="footer-note"><Check size={13} /> {t.lookingGood}</span></div>}
          </section>
          <footer className="page-footer"><span>{t.footer}</span><span>{t.footerMonth} <span className="footer-heart">â™¥</span></span></footer>
        </div>}
      </main>
      {(showModal || editingTransaction) && <Modal language={language} selectedMonth={selectedMonth} transaction={editingTransaction} platforms={platforms} customCategories={customCategories} onClose={closeModal} onSave={saveTransaction} />}
      {showFireGoalModal && <FireGoalModal language={language} goal={fireGoal} onClose={() => setShowFireGoalModal(false)} onSave={saveFireGoal} />}
    </div>
  )
}

export default App
