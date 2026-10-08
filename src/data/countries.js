/**
 * The countries the app can reason about.
 *
 * Codes are ISO 3166-1 alpha-2 and names are rendered by `Intl.DisplayNames`,
 * so adding a country is a one-word change here — no translations to write.
 * The list is deliberately the ones we can plausibly attach tax, retirement age
 * and pension data to later: the EU, the UK, the US and Canada, plus the
 * Portuguese-speaking countries.
 */
export const COUNTRY_CODES = [
  'PT', 'ES', 'FR', 'DE', 'IT', 'NL', 'BE', 'LU', 'IE', 'AT',
  'FI', 'SE', 'DK', 'NO', 'IS', 'PL', 'CZ', 'SK', 'HU', 'RO',
  'BG', 'HR', 'SI', 'EE', 'LV', 'LT', 'GR', 'CY', 'MT', 'CH',
  'GB', 'US', 'CA', 'BR', 'AO', 'MZ', 'CV', 'GW', 'ST', 'TL',
]

export const isKnownCountry = (code) => COUNTRY_CODES.includes(code)
