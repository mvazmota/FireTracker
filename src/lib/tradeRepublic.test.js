import { describe, expect, it } from 'vitest'
import { detectCategory, parseTradeRepublicCsv, TRADE_REPUBLIC } from './tradeRepublic.js'

const HEADER = '"datetime","date","account_type","category","type","asset_class","name","symbol","shares","price","amount","fee","tax","currency","original_amount","original_currency","fx_rate","description","transaction_id","counterparty_name","counterparty_iban","payment_reference","mcc_code"'

/** Builds one export row from the handful of columns the parser reads. */
function row({ datetime, date, type, name = '', description = '', amount, mcc = '', id = '' }) {
  return [datetime, date, 'DEFAULT', 'CASH', type, '', name, '', '', '', amount, '', '', 'EUR', '', '', '', description, id, '', '', '', mcc]
    .map((cell) => `"${cell}"`)
    .join(',')
}

const csv = (...rows) => [HEADER, ...rows].join('\n')

describe('detectCategory', () => {
  it('trusts the merchant code', () => {
    expect(detectCategory({ transactionType: 'CARD_TRANSACTION', name: 'SOMETHING', mcc: '5411' })).toBe('Food & dining')
  })

  it('falls back to the merchant name when the code is unknown', () => {
    expect(detectCategory({ transactionType: 'CARD_TRANSACTION', name: 'KINGUIN', mcc: '5262' })).toBe('Entertainment')
  })

  it('reads the interest type before anything else', () => {
    expect(detectCategory({ transactionType: 'INTEREST_PAYMENT', description: 'Interest payment' })).toBe('Other')
  })

  it('leaves a transfer for the user', () => {
    expect(detectCategory({ transactionType: 'TRANSFER_INSTANT_INBOUND', name: 'MARTINHO VAZ MOTA' })).toBeNull()
  })

  it('gives up when nothing points anywhere', () => {
    expect(detectCategory({ transactionType: 'CARD_TRANSACTION', name: 'ZZZQQQ', mcc: '' })).toBeNull()
  })
})

describe('parseTradeRepublicCsv', () => {
  it('reads a card payment as a spending row', () => {
    const { rows } = parseTradeRepublicCsv(csv(row({
      datetime: '2026-09-04T09:43:33.931607Z', date: '2026-09-04', type: 'CARD_TRANSACTION',
      name: 'INTERMACHE', amount: '-9.060000', mcc: '5411', id: 'abc-1',
    })))
    expect(rows).toHaveLength(1)
    expect(rows[0]).toEqual({
      id: 'tr-abc-1',
      title: 'INTERMACHE',
      category: 'Food & dining',
      type: 'expense',
      amount: 9.06,
      date: '2026-09-04T09:43:33',
      platform: TRADE_REPUBLIC,
    })
  })

  it('reads a positive amount as income', () => {
    const { rows } = parseTradeRepublicCsv(csv(row({
      datetime: '2026-09-01T06:52:28.749612Z', date: '2026-09-01', type: 'INTEREST_PAYMENT',
      description: 'Interest payment for payout collection 01a05b4b', amount: '72.160000', id: 'abc-2',
    })))
    expect(rows[0].type).toBe('income')
    expect(rows[0].category).toBe('Other')
    expect(rows[0].title).toBe('Interest payment')
  })

  it('asks for a transfer, because only the user knows what it is', () => {
    const { rows } = parseTradeRepublicCsv(csv(row({
      datetime: '2026-09-22T11:47:55.762526Z', date: '2026-09-22', type: 'TRANSFER_INSTANT_INBOUND',
      name: 'MARTINHO VAZ MOTA', description: 'Incoming transfer from MARTINHO VAZ MOTA (PT50003509)', amount: '15000.000000', id: 'abc-3',
    })))
    expect(rows[0].type).toBe('income')
    expect(rows[0].category).toBeNull()
  })

  it('does not put a spending category on an income row', () => {
    const { rows } = parseTradeRepublicCsv(csv(row({
      datetime: '2026-09-10T10:00:00.000000Z', date: '2026-09-10', type: 'CARD_TRANSACTION',
      name: 'INTERMACHE', amount: '5.000000', mcc: '5411', id: 'abc-4',
    })))
    expect(rows[0].type).toBe('income')
    expect(rows[0].category).toBeNull()
  })

  it('keeps commas inside quoted fields', () => {
    const { rows } = parseTradeRepublicCsv(csv(row({
      datetime: '2026-09-05T09:00:00.000000Z', date: '2026-09-05', type: 'CARD_TRANSACTION',
      name: 'SHOP, LISBON', amount: '-4.000000', mcc: '5999', id: 'abc-5',
    })))
    expect(rows[0].title).toBe('SHOP, LISBON')
  })

  it('skips rows with no amount or no date, and counts them', () => {
    const { rows, skipped } = parseTradeRepublicCsv(csv(
      row({ datetime: '', date: '', type: 'CARD_TRANSACTION', name: 'A', amount: '-1.000000' }),
      row({ datetime: '2026-09-05T09:00:00.000000Z', date: '2026-09-05', type: 'CARD_TRANSACTION', name: 'B', amount: '0.000000' }),
      row({ datetime: '2026-09-06T09:00:00.000000Z', date: '2026-09-06', type: 'CARD_TRANSACTION', name: 'C', amount: '-2.000000', mcc: '5999', id: 'abc-6' }),
    ))
    expect(rows).toHaveLength(1)
    expect(skipped).toBe(2)
  })

  it('falls back to the date when the timestamp is missing', () => {
    const { rows } = parseTradeRepublicCsv(csv(row({
      datetime: '', date: '2026-09-07', type: 'CARD_TRANSACTION', name: 'D', amount: '-3.000000', mcc: '5999', id: 'abc-7',
    })))
    expect(rows[0].date).toBe('2026-09-07T12:00:00')
  })

  it('returns nothing for a file without the expected columns', () => {
    expect(parseTradeRepublicCsv('nope').rows).toEqual([])
    expect(parseTradeRepublicCsv('').rows).toEqual([])
  })
})
