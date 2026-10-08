import { useI18n } from '../../i18n/LanguageProvider.jsx'
import { formatPercent } from '../../lib/format.js'

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
    { key: 'ter', label: t.etfTer, value: facts.ter != null ? formatPercent(facts.ter, language) : null },
    { key: 'distribution', label: t.etfDistribution, value: facts.distribution ? (facts.distribution === 'accumulating' ? t.etfAccumulating : t.etfDistributing) : null },
    { key: 'dividend', label: t.etfDividend, value: facts.dividendYield != null ? formatPercent(facts.dividendYield, language) : null },
    { key: 'inception', label: t.etfInception, value: facts.inception },
  ].filter((row) => row.value)

  return <dl className="fund-facts">{rows.map((row) => <div key={row.key}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl>
}
