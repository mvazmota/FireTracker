import { useI18n } from '../../i18n/LanguageProvider.jsx'
import { formatCurrency, formatPercent } from '../../lib/format.js'

/**
 * The coin behind a holding: what it is worth now, how it moved today, and
 * where it has traded over the past year. Fields the feed does not know are
 * left out rather than shown blank, so a missing number never looks like a zero.
 */
export default function CryptoFacts({ symbol, name, market }) {
  const { t, language } = useI18n()

  if (!symbol) return <p className="fund-facts-empty">{t.cryptoFactsNoSymbol}</p>
  if (market?.unavailable) return <p className="fund-facts-empty">{t.etfFactsUnavailable}</p>

  const rows = [
    { key: 'name', label: t.cryptoAsset, value: name },
    { key: 'price', label: t.cryptoPrice, value: market?.price != null ? formatCurrency(market.price, language) : null },
    { key: 'change', label: t.cryptoChange24h, value: market?.changePercent != null ? formatPercent(market.changePercent, language) : null },
    { key: 'high52', label: t.cryptoHigh52, value: market?.high52 != null ? formatCurrency(market.high52, language) : null },
    { key: 'low52', label: t.cryptoLow52, value: market?.low52 != null ? formatCurrency(market.low52, language) : null },
  ].filter((row) => row.value)

  if (!rows.length) return <p className="fund-facts-empty">{t.etfFactsUnavailable}</p>

  return <div className="fund-facts-panel"><dl className="fund-facts">{rows.map((row) => <div key={row.key}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl></div>
}
