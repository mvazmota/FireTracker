import IconBadge from '../ui/IconBadge.jsx'
import { useMemo, useRef, useState } from 'react'
import { ArrowDownLeft, Coffee, Pencil, Plus, Search, Upload, X } from 'lucide-react'
import { formatCurrency } from '../../lib/format.js'
import { formatDateTime } from '../../lib/dates.js'
import { categoryInfo } from '../../data/categories.js'
import { useI18n } from '../../i18n/LanguageProvider.jsx'
import { parseTradeRepublicCsv } from '../../lib/tradeRepublic.js'
import BulkEntryModal from './BulkEntryModal.jsx'
import ImportModal from './ImportModal.jsx'
export default function AllTransactionsPage({ transactions, selectedMonth, onAdd, onEdit, onDelete, onSaveMany }) {
  const { t, locale, language } = useI18n()
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(20)
  const [showBulk, setShowBulk] = useState(false)
  const [imported, setImported] = useState(null)
  const [importError, setImportError] = useState('')
  const importFile = useRef(null)

  /** Reads a Trade Republic export and hands the rows to the review screen. */
  async function readImportFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const parsed = parseTradeRepublicCsv(await file.text())
      if (!parsed.rows.length) return setImportError(t.importNoRows)
      setImportError('')
      setImported({ ...parsed, fileName: file.name })
    } catch {
      setImportError(t.importReadError)
    }
  }
  const filtered = useMemo(() => transactions.filter((item) => {
    const matchesFilter = filter === 'all'
      || (filter === 'investment' ? ['Investment', 'Investments'].includes(item.category) : item.type === filter)
    const searchText = `${item.title} ${item.category} ${t.categoryNames[item.category] || ''} ${item.type} ${item.date} ${item.amount} ${item.platform || ''}`.toLowerCase()
    return matchesFilter && searchText.includes(query.toLowerCase())
  }).sort((a, b) => b.date.localeCompare(a.date)), [transactions, filter, query, t])
  const visible = filtered.slice(0, limit)
  const filters = [['all', t.allActivity], ['expense', t.expenses.charAt(0) + t.expenses.slice(1).toLowerCase()], ['income', t.income.charAt(0) + t.income.slice(1).toLowerCase()], ['investment', t.investmentActivity]]

  return <div className="page-content all-transactions-page">
    <section className="welcome-row"><div><p className="eyebrow">{t.transactions.toUpperCase()}</p><h1>{t.allTransactions}<span>.</span></h1><p className="welcome-sub">{t.allTransactionsSubtitle}</p></div><div className="welcome-actions"><button className="primary-button" onClick={onAdd}><Plus size={18} /> {t.addTransaction}</button><button className="view-all-button" onClick={() => setShowBulk(true)}><Plus size={15} /> {t.addMany}</button><button className="view-all-button" onClick={() => importFile.current?.click()}><Upload size={15} /> {t.importTransactions}</button></div></section>
    {importError && <p className="form-error import-error">{importError}</p>}
    <section className="panel transactions-panel all-transactions-panel"><div className="transaction-controls"><div className="filter-tabs" role="tablist" aria-label={t.transactions}>{filters.map(([value, label]) => <button key={value} role="tab" aria-selected={filter === value} className={filter === value ? 'filter-tab active-filter' : 'filter-tab'} onClick={() => { setFilter(value); setLimit(20) }}>{label}</button>)}</div><label className="search-box"><Search size={15} /><input aria-label={t.search} placeholder={t.search} value={query} onChange={(event) => { setQuery(event.target.value); setLimit(20) }} /></label></div>
      <div className="transaction-table"><div className="table-head"><span>{t.transaction}</span><span>{t.category}</span><span>{t.platform}</span><span>{t.date}</span><span>{t.amount}</span><span /></div>
        {visible.length ? visible.map((item) => { const info = categoryInfo(item.category, item.type); const typeLabel = item.type === 'income' ? t.income.charAt(0) + t.income.slice(1).toLowerCase() : t.expense; return <div className="transaction-row" key={item.id}><div className="transaction-main"><IconBadge icon={info.icon} color={info.color} /><div className="transaction-title"><button className="transaction-edit-trigger" onClick={() => onEdit(item)} aria-label={`${t.edit} ${item.title}`}>{item.title}</button><span>{typeLabel}{item.isDemo && <i className="sample-chip">{t.sampleData}</i>}</span><span className="transaction-platform-mobile">{item.platform || t.noPlatform}</span></div></div><span className="category-pill"><i style={{ background: info.color }} />{t.categoryNames[item.category] || item.category}</span><span className="platform-pill">{item.platform || '—'}</span><span className="transaction-date">{formatDateTime(item.date, locale, true)}</span><span className={`transaction-amount ${item.type}`}>{item.type === 'income' ? '+' : '−'}{formatCurrency(item.amount, language)}</span><div className="transaction-actions"><button className="edit-row" onClick={() => onEdit(item)} aria-label={`${t.edit} ${item.title}`} title={t.edit}><Pencil size={15} /></button><button className="delete-row" onClick={() => onDelete(item.id)} aria-label={`${t.delete} ${item.title}`} title={t.delete}><X size={15} /></button></div></div> }) : <div className="empty-transactions"><span className="empty-icon"><Coffee size={21} /></span><strong>{t.noTransactions}</strong><p>{t.trySearch}</p></div>}
      </div>
      <div className="all-transactions-footer"><span>{t.showing} <strong>{visible.length}</strong> {t.of} <strong>{filtered.length}</strong> {t.transactions.toLowerCase()}</span>{visible.length < filtered.length && <button className="text-button" onClick={() => setLimit((current) => current + 20)}>{t.loadMore} <ArrowDownLeft size={14} /></button>}</div>
    </section>
    <footer className="page-footer"><span>{t.footer}</span><span>{t.footerMonth} <span className="footer-heart">♥</span></span></footer>
    {showBulk && <BulkEntryModal selectedMonth={selectedMonth} onClose={() => setShowBulk(false)} onSave={(rows) => { onSaveMany(rows); setShowBulk(false) }} />}
    <input ref={importFile} className="avatar-file-input" type="file" accept=".csv,text/csv" onChange={readImportFile} />
    {imported && <ImportModal rows={imported.rows} fileName={imported.fileName} skipped={imported.skipped} onClose={() => setImported(null)} onSave={(rows) => { onSaveMany(rows); setImported(null) }} />}
  </div>
}
