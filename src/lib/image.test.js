import { describe, expect, it } from 'vitest'
import { initialsForName } from './image.js'

describe('initialsForName', () => {
  it('uses the first letter of the first two words', () => {
    expect(initialsForName('Demo Acc')).toBe('DA')
    expect(initialsForName('ana maria silva')).toBe('AM')
  })

  it('uppercases and ignores extra whitespace', () => {
    expect(initialsForName('  martinho   vaz  ')).toBe('MV')
  })

  it('handles a single name', () => {
    expect(initialsForName('Martinho')).toBe('M')
  })

  it('falls back to F when there is nothing to work with', () => {
    expect(initialsForName('')).toBe('F')
    expect(initialsForName('   ')).toBe('F')
    expect(initialsForName(null)).toBe('F')
    expect(initialsForName(undefined)).toBe('F')
  })
})
