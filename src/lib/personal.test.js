import { describe, expect, it } from 'vitest'
import { ageFromBirthYear, birthYearFromAge, countryName, countryOptions, isUsableBirthYear } from './personal.js'

const TODAY = new Date(2026, 9, 8)

describe('ageFromBirthYear', () => {
  it('is the difference in years', () => {
    expect(ageFromBirthYear(1990, TODAY)).toBe(36)
  })

  it('is zero for someone born this year', () => {
    expect(ageFromBirthYear(2026, TODAY)).toBe(0)
  })

  it('rejects a year in the future', () => {
    expect(ageFromBirthYear(2030, TODAY)).toBeNull()
  })

  it('rejects anything that is not a plausible year', () => {
    expect(ageFromBirthYear('', TODAY)).toBeNull()
    expect(ageFromBirthYear(null, TODAY)).toBeNull()
    expect(ageFromBirthYear(1700, TODAY)).toBeNull()
  })
})

describe('birthYearFromAge', () => {
  it('is the inverse of ageFromBirthYear', () => {
    expect(ageFromBirthYear(birthYearFromAge(36, TODAY), TODAY)).toBe(36)
  })

  it('rejects nonsense', () => {
    expect(birthYearFromAge(-1, TODAY)).toBeNull()
    expect(birthYearFromAge(200, TODAY)).toBeNull()
  })
})

describe('isUsableBirthYear', () => {
  it('accepts a real year and rejects the rest', () => {
    expect(isUsableBirthYear(1990, TODAY)).toBe(true)
    expect(isUsableBirthYear('', TODAY)).toBe(false)
  })
})

describe('countryName', () => {
  it('names a known country in the active language', () => {
    expect(countryName('PT', 'en')).toBe('Portugal')
    expect(countryName('PT', 'pt')).toBe('Portugal')
    expect(countryName('DE', 'en')).toBe('Germany')
  })

  it('is empty for anything unknown', () => {
    expect(countryName('ZZ', 'en')).toBe('')
    expect(countryName('', 'en')).toBe('')
    expect(countryName(null, 'en')).toBe('')
  })
})

describe('countryOptions', () => {
  it('lists every country with a name', () => {
    const options = countryOptions('en')
    expect(options.length).toBeGreaterThan(20)
    expect(options.every((option) => option.code && option.name)).toBe(true)
    expect(options[0].code).toBe('PT')
  })
})
