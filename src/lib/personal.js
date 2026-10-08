import { COUNTRY_CODES, isKnownCountry } from '../data/countries.js'

/** The earliest birth year we will believe. */
const EARLIEST_BIRTH_YEAR = 1900

/**
 * Age from a year of birth.
 *
 * Only the year is stored, so this is the difference in years rather than a
 * birthday-aware age — which is exactly what "you will be 47" needs, since the
 * horizon is measured in whole years anyway. Returns null when there is nothing
 * sensible to work with.
 */
export function ageFromBirthYear(birthYear, today = new Date()) {
  const year = Number(birthYear)
  const thisYear = today.getFullYear()
  if (!Number.isFinite(year) || year < EARLIEST_BIRTH_YEAR || year > thisYear) return null
  return thisYear - year
}

/** The year someone born in `birthYear` turns `age`. */
export function birthYearFromAge(age, today = new Date()) {
  const years = Number(age)
  if (!Number.isFinite(years) || years < 0 || years > 120) return null
  return today.getFullYear() - Math.round(years)
}

/** Whether a stored birth year is one we can use. */
export function isUsableBirthYear(birthYear, today = new Date()) {
  return ageFromBirthYear(birthYear, today) != null
}

/** A country's name in the active language, falling back to the raw code. */
export function countryName(code, locale = 'en') {
  if (!isKnownCountry(code)) return ''
  try {
    return new Intl.DisplayNames([locale], { type: 'region' }).of(code) || code
  } catch {
    return code
  }
}

/** Every country as `{ code, name }`, named in the active language. */
export function countryOptions(locale = 'en') {
  return COUNTRY_CODES.map((code) => ({ code, name: countryName(code, locale) }))
}
