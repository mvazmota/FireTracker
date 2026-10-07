import InvestmentHistoryModal from './InvestmentHistoryModal.jsx'
import SavingsAccountModal from './SavingsAccountModal.jsx'
import SavingsDepositModal from './SavingsDepositModal.jsx'
import { useState } from 'react'
import { Landmark, Pencil, Plus, TrendingUp, Wallet, X } from 'lucide-react'
import { formatCurrency, formatRate } from '../../lib/format.js'
import { messages } from '../../i18n/messages.jsx'
export default function SavingsPage({ language, accounts, onSave, onDelete, platforms }) {
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
      {accounts.length ? <div className="holdings-table-wrap"><table className="holdings-table savings-table"><thead><tr><th>{t.savingsAccountName}</th><th>{t.institution}</th><th>{t.marketValue}</th><th>{t.savingsTarget}</th><th>{t.savingsRate}</th><th>{t.history}</th><th /></tr></thead><tbody>{accounts.map((account) => { const targetProgress = account.target ? Math.max(0, Math.min(100, account.balance / account.target * 100)) : 0; return <tr key={account.id}><td><span className="holding-fund"><span className="holding-symbol"><Wallet size={15} /></span><span className="holding-name">{account.name}{account.isDemo && <i className="sample-chip">{t.sampleData}</i>}</span></span></td><td>{account.institution}</td><td className="holding-value">{formatCurrency(account.balance, language)}</td><td>{account.target ? <div className="savings-target-cell"><strong>{formatCurrency(account.target, language)}</strong><div><span style={{ width: `${targetProgress}%` }} /></div><small>{targetProgress.toFixed(0)}%</small></div> : '—'}</td><td>{formatRate(account.annualRate, language)}</td><td><button className="history-table-button" onClick={() => setHistoryAccount(account)}>{account.history?.length || 0} {t.snapshots}</button></td><td><div className="transaction-actions"><button className="deposit-row" onClick={() => setDepositAccount(account)} aria-label={`${t.addMoney}: ${account.name}`} title={t.addMoney}><Plus size={15} /></button><button className="edit-row" onClick={() => setEditing(account)} aria-label={`${t.editSavingsAccount}: ${account.name}`} title={t.edit}><Pencil size={15} /></button><button className="delete-row" onClick={() => onDelete(account)} aria-label={`${t.removeRecord}: ${account.name}`} title={t.delete}><X size={15} /></button></div></td></tr> })}</tbody></table></div> : <div className="empty-transactions"><span className="empty-icon"><Wallet size={21} /></span><strong>{t.noSavings}</strong><p>{t.addFirstSavings}</p><button className="text-button" onClick={() => setShowModal(true)}><Plus size={15} /> {t.addSavingsAccount}</button></div>}
    </section>
    <footer className="page-footer"><span>{t.savingsAccountNote}</span><span>{t.footerMonth} <span className="footer-heart">♥</span></span></footer>
    {(showModal || editing) && <SavingsAccountModal language={language} account={editing} onClose={closeAccountModal} onSave={saveAccount} platforms={platforms} />}
    {depositAccount && <SavingsDepositModal language={language} account={depositAccount} onClose={() => setDepositAccount(null)} onDeposit={addDeposit} />}
    {historyAccount && <InvestmentHistoryModal language={language} kind="savings" record={historyAccount} onClose={() => setHistoryAccount(null)} onSave={(record) => { onSave(record); setHistoryAccount(null) }} />}
  </div>
}
