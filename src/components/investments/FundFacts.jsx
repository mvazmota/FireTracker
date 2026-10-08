import { useEffect, useState } from 'react'
import { useI18n } from '../../i18n/LanguageProvider.jsx'
import { formatRate } from '../../lib/format.js'
import { api } from '../../lib/api.js'

/**
 * The annual cost. No free feed publishes it, so it is the one fund fact the
 * app asks for — typed once per fund, then cached for every other holding of
 * the same fund.
 */
function TerField({ ter, isin }) {
  const { t } = useI18n()
  const [draft, setDraft] = useState(ter != null ? String(Math.round(ter * 10000) / 100) : '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setDraft(ter != null ? String(Math.round(ter * 10000) / 100) : '')
    setSaving(false)
  }, [ter])

  async function commit() {
    const parsed = Number(draft.replace(',', '.'))
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) return
    const next = parsed / 100
    if (next === ter) return
    setSaving(true)
    try {
      await api.saveEtfTer(isin, next)
    } catch {
      // The value stays in the input, so a failed save is not a lost one.
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <dt>{t.etfTer}</dt>
      <dd>
        <span className="fund-facts-ter">
          <input
            type="number"
            min="0"
            max="100"
            step="any"
            value={draft}
            placeholder="0.07"
            aria-label={t.etfTer}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => { if (event.key === 'Enter') event.target.blur() }}
          />
          <span className="fund-facts-unit">%</span>
          {saving && <span className="fund-facts-hint">{t.saving}</span>}
        </span>
        <small className="fund-facts-hint">{t.etfTerHint}</small>
      </dd>
    </div>
  )
}

/**
 * The fund behind a holding: who runs it, how big it is, what it charges and
 * whether it pays anything out. Fields the feed does not know are left out
 * rather than shown blank, so a missing number never looks like a zero.
 */
export default function FundFacts({ facts, isin }) {
  const { t, language } = useI18n()

  if (!isin) return <p className="fund-facts-empty">{t.etfFactsNoIsin}</p>
  if (!facts) return <p className="fund-facts-empty">{t.loading}</p>
  if (facts.unavailable) return <p className="fund-facts-empty">{t.etfFactsUnavailable}</p>

  const compact = new Intl.NumberFormat(language === 'pt' ? 'pt-PT' : 'en-IE', { notation: 'compact', maximumFractionDigits: 1 })

  const rows = [
    { key: 'isin', label: t.isin, value: facts.isin },
    { key: 'issuer', label: t.etfIssuer, value: facts.issuer },
    { key: 'size', label: t.etfFundSize, value: facts.fundSize ? `€${compact.format(facts.fundSize)}` : null },
    { key: 'distribution', label: t.etfDistribution, value: facts.distribution ? (facts.distribution === 'accumulating' ? t.etfAccumulating : t.etfDistributing) : null },
    { key: 'dividend', label: t.etfDividend, value: facts.dividendYield != null ? formatRate(facts.dividendYield * 100, language) : null },
    { key: 'inception', label: t.etfInception, value: facts.inception },
  ].filter((row) => row.value)

  return (
    <div className="fund-facts-panel">
      <dl className="fund-facts">
        {rows.map((row) => <div key={row.key}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}
        <TerField ter={facts.ter} isin={facts.isin} />
      </dl>
      {facts.distribution === 'distributing' && <p className="fund-facts-note">{t.etfDistributingNote}</p>}
    </div>
  )
}
