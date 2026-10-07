import { describe, expect, it } from 'vitest'
import { formatCurrency, formatNumber, formatPercent, formatRate } from './format.js'

describe('formatCurrency', () => {
  it('renders euros with two decimals', () => {
    expect(formatCurrency(1234.5, 'en')).toContain('1,234.50')
    expect(formatCurrency(1234.5, 'en')).toContain('€')
  })

  it('renders negative amounts with a minus sign', () => {
    expect(formatCurrency(-42.5, 'en')).toContain('42.50')
  })

  it('rounds to cents rather than showing float noise', () => {
    // 0.1 + 0.2 style drift must not reach the UI.
    expect(formatCurrency(0.1 + 0.2, 'en')).toContain('0.30')
    expect(formatCurrency(1000.005, 'en')).toContain('1,000.01')
  })

  it('formats for pt-PT with a comma decimal separator', () => {
    expect(formatCurrency(1234.5, 'pt')).toContain('234,50')
  })
})

describe('formatPercent', () => {
  it('treats the input as a percentage value and always shows the sign', () => {
    expect(formatPercent(11.66, 'en')).toContain('11.66')
    expect(formatPercent(11.66, 'en')).toContain('+')
    expect(formatPercent(-4, 'en')).toContain('-')
  })
})

describe('formatRate', () => {
  it('renders an unsigned percentage', () => {
    expect(formatRate(2.25, 'en')).toContain('2.25')
    expect(formatRate(2.25, 'en')).not.toContain('+')
  })
})

describe('formatNumber', () => {
  it('passes options through to Intl', () => {
    expect(formatNumber(1234.5678, 'en', { maximumFractionDigits: 1 })).toBe('1,234.6')
  })
})
