import { describe, expect, it } from 'vitest'
import { roundMoney } from './money.js'

describe('roundMoney', () => {
  it('leaves exact cents alone', () => {
    expect(roundMoney(1234.56)).toBe(1234.56)
    expect(roundMoney(0)).toBe(0)
    expect(roundMoney(-42.5)).toBe(-42.5)
  })

  it('rounds to two decimals', () => {
    expect(roundMoney(10.005)).toBe(10.01)
    expect(roundMoney(10.004)).toBe(10)
    expect(roundMoney(99.999999)).toBe(100)
  })

  it('cleans up floating-point drift', () => {
    expect(roundMoney(0.1 + 0.2)).toBe(0.3)
    expect(roundMoney(1000.0000000001)).toBe(1000)
  })

  it('handles values that only drift in binary representation', () => {
    // 1.005 is actually 1.00499999... in binary, so this needs the epsilon nudge.
    expect(roundMoney(1.005)).toBe(1.01)
    expect(roundMoney(2.675)).toBe(2.68)
  })

  it('treats non-numeric input as zero', () => {
    expect(roundMoney(undefined)).toBe(0)
    expect(roundMoney(null)).toBe(0)
    expect(roundMoney('nonsense')).toBe(0)
    expect(roundMoney(NaN)).toBe(0)
    expect(roundMoney(Infinity)).toBe(0)
  })

  it('accepts numeric strings', () => {
    expect(roundMoney('12.345')).toBe(12.35)
  })
})
