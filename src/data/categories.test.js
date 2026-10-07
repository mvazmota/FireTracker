import { describe, expect, it } from 'vitest'
import { CATEGORY_TYPES, categoryCatalogue, categoryInfo, categorySuggestions } from './categories.js'

describe('categoryCatalogue', () => {
  it('covers expenses and income', () => {
    expect(CATEGORY_TYPES).toEqual(['expense', 'income'])
    expect(categoryCatalogue.expense.length).toBeGreaterThan(0)
    expect(categoryCatalogue.income.length).toBeGreaterThan(0)
  })

  it('gives every entry a name, an icon and a hex colour', () => {
    for (const type of CATEGORY_TYPES) {
      for (const entry of categoryCatalogue[type]) {
        expect(entry.name).toBeTruthy()
        expect(entry.icon).toBeTruthy()
        expect(entry.color).toMatch(/^#[0-9a-f]{6}$/i)
      }
    }
  })

  it('keeps "Other" as the last entry of each list, since it is the fallback', () => {
    expect(categoryCatalogue.expense.at(-1).name).toBe('Other')
    expect(categoryCatalogue.income.at(-1).name).toBe('Other')
  })
})

describe('categorySuggestions', () => {
  it('returns names in catalogue order', () => {
    expect(categorySuggestions('expense')[0]).toBe('Food & dining')
    expect(categorySuggestions('income')).toContain('Salary')
  })

  it('returns an empty list for an unknown type', () => {
    expect(categorySuggestions('nope')).toEqual([])
  })
})

describe('categoryInfo', () => {
  it('finds a known category in its own list', () => {
    expect(categoryInfo('Housing', 'expense').name).toBe('Housing')
    expect(categoryInfo('Salary', 'income').name).toBe('Salary')
  })

  it('falls back to Other for a name it does not know', () => {
    expect(categoryInfo('Pets', 'expense').name).toBe('Other')
    expect(categoryInfo('Pets', 'income').name).toBe('Other')
  })

  it('assumes expenses when no type is given', () => {
    expect(categoryInfo('Food & dining').name).toBe('Food & dining')
  })
})
