// Reads a Trade Republic transaction export — the CSV the app downloads from
// the cash account — and turns it into the transactions this app stores. As
// much as the file allows is filled in; a row the file does not categorise is
// left without a category so the import screen can ask for it.

/** Every row of this export belongs to this platform. */
export const TRADE_REPUBLIC = 'Trade Republic'

/**
 * Merchant Category Codes mapped to this app's category names. The code is the
 * merchant's own declaration, so it is trusted before the merchant's name.
 */
const MCC_CATEGORIES = {
  4111: 'Transport', 4112: 'Transport', 4121: 'Transport', 4131: 'Transport',
  4784: 'Transport', 5541: 'Transport', 5542: 'Transport', 7523: 'Transport',
  7531: 'Transport', 7534: 'Transport', 7535: 'Transport', 7538: 'Transport',
  7542: 'Transport', 7549: 'Transport',
  4814: 'Housing', 4816: 'Housing', 4899: 'Housing', 4900: 'Housing',
  5411: 'Food & dining', 5412: 'Food & dining', 5422: 'Food & dining',
  5441: 'Food & dining', 5451: 'Food & dining', 5462: 'Food & dining',
  5499: 'Food & dining', 5812: 'Food & dining', 5813: 'Food & dining',
  5814: 'Food & dining',
  5122: 'Health', 5297: 'Health', 5912: 'Health', 5975: 'Health', 5976: 'Health',
  8011: 'Health', 8021: 'Health', 8031: 'Health', 8041: 'Health', 8042: 'Health',
  8043: 'Health', 8049: 'Health', 8050: 'Health', 8062: 'Health', 8071: 'Health',
  8099: 'Health',
  5815: 'Entertainment', 5816: 'Entertainment', 5817: 'Entertainment',
  5818: 'Entertainment', 7832: 'Entertainment', 7841: 'Entertainment',
  7922: 'Entertainment', 7991: 'Entertainment', 7992: 'Entertainment',
  7993: 'Entertainment', 7994: 'Entertainment', 7996: 'Entertainment',
  7997: 'Entertainment', 7998: 'Entertainment', 7999: 'Entertainment',
  4812: 'Shopping', 5310: 'Shopping', 5311: 'Shopping', 5331: 'Shopping',
  5399: 'Shopping', 5611: 'Shopping', 5621: 'Shopping', 5631: 'Shopping',
  5651: 'Shopping', 5655: 'Shopping', 5661: 'Shopping', 5691: 'Shopping',
  5697: 'Shopping', 5698: 'Shopping', 5699: 'Shopping', 5712: 'Shopping',
  5713: 'Shopping', 5714: 'Shopping', 5718: 'Shopping', 5719: 'Shopping',
  5722: 'Shopping', 5732: 'Shopping', 5733: 'Shopping', 5734: 'Shopping',
  5735: 'Shopping', 5941: 'Shopping', 5942: 'Shopping', 5943: 'Shopping',
  5944: 'Shopping', 5945: 'Shopping', 5946: 'Shopping', 5947: 'Shopping',
  5948: 'Shopping', 5949: 'Shopping', 5950: 'Shopping', 5964: 'Shopping',
  5965: 'Shopping', 5966: 'Shopping', 5967: 'Shopping', 5968: 'Shopping',
  5969: 'Shopping', 5970: 'Shopping', 5971: 'Shopping', 5972: 'Shopping',
  5973: 'Shopping', 5977: 'Shopping', 5978: 'Shopping', 5983: 'Shopping',
  5992: 'Shopping', 5993: 'Shopping', 5994: 'Shopping', 5995: 'Shopping',
  5996: 'Shopping', 5997: 'Shopping', 5998: 'Shopping', 5999: 'Shopping',
}

/**
 * Words in the merchant name, used when the code does not decide. Kept to
 * distinctive names: a short token would match half the alphabet.
 */
const NAME_HINTS = [
  [/RESTAURANT|RESTAURA|CAFE|CAFÉ|PASTELARIA|PIZZARIA|PIZZERIA|TASCA|BURGER|SNACK|CHURRASQUEIRA|GELATARIA|PADARIA|TALHO|PEIXARIA|\bBAR\b|CONTINENTE|PINGO DOCE|INTERMACHE|MINIPRECO|MERCADONA|AUCHAN|LIDL|ALDI|SUPERMERCADO|MERCEARIA|HORTA|AGRICOLA|MERCADO/i, 'Food & dining'],
  [/\bBP\b|GALP|REPSOL|CEPSA|PETROPRIX|\bPRIO\b|SHELL|COMBUST|GASOLIN|ESTACIONAMENTO|PARKING|PARQUE|\bMETRO\b|\bCP\b|\bTAP\b|UBER|\bBOLT\b|FREENOW|VIA VERDE|\bSCUT\b/i, 'Transport'],
  [/FARMACIA|FARMÁCIA|CLINICA|CLÍNICA|HOSPITAL|MEDICO|MÉDICO|DENTISTA|ANALISES|ANÁLISES|OPTICA|ÓPTICA|PARAFARMACIA/i, 'Health'],
  [/STEAM|KINGUIN|PLAYSTATION|XBOX|NINTENDO|NETFLIX|SPOTIFY|HBO|DISNEY|CINEMA|MUSEU|TEATRO|CONCERTO|TWITCH|GAMING|\bGAME/i, 'Entertainment'],
  [/AMAZON|ALIEXPRESS|SHEIN|\bZARA\b|FNAC|WORTEN|IKEA|DECATHLON|PRIMARK|BAZAR|SPORT ZONE|CORTE INGLES/i, 'Shopping'],
  [/ARRENDAMENTO|\bRENDA\b|\bEDP\b|IBERDROLA|SANEAMENTO|CONDOMINIO|CONDOMÍNIO|\bIMI\b|SEGURO|ENERGIA/i, 'Housing'],
]

/** Types that always carry the same category, whatever the merchant. */
const FIXED_CATEGORIES = {
  INTEREST_PAYMENT: 'Other',
  DIVIDEND: 'Other',
  BUY: 'Investment',
  SELL: 'Investment',
  SAVINGS_PLAN: 'Investment',
}

/**
 * Types whose meaning is the user's own bookkeeping — moving money between
 * their own accounts — so the file cannot know the category and it is asked.
 */
const ASK_TYPES = new Set([
  'TRANSFER_INSTANT_INBOUND', 'TRANSFER_INBOUND',
  'TRANSFER_INSTANT_OUTBOUND', 'TRANSFER_OUTBOUND',
])

/** The catalogue's income categories; anything else on an income row is asked. */
const INCOME_CATEGORIES = new Set(['Salary', 'Freelance', 'Gift', 'Other'])

/** Splits a CSV into rows, honouring quoted fields and doubled quotes. */
function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else quoted = false
      } else field += char
    } else if (char === '"') quoted = true
    else if (char === ',') { row.push(field); field = '' }
    else if (char === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else if (char !== '\r') field += char
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row) }
  return rows
}

const clean = (value) => String(value ?? '').replace(/\s+/g, ' ').trim()

/** The file's own timestamp, or its date at midday when the time is missing. */
function toDate(datetime, date) {
  const stamp = datetime.slice(0, 19)
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(stamp)) return stamp
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T12:00:00` : null
}

/** A readable title: the merchant, or a trimmed version of the description. */
function toTitle(name, description, type) {
  const merchant = clean(name)
  if (merchant) return merchant
  const text = clean(description)
  if (text) return text.split(' (')[0].split(' for ')[0].slice(0, 60).trim() || text.slice(0, 60)
  return clean(type.replaceAll('_', ' ')) || 'Transaction'
}

/**
 * The category the file implies, or null when it has to be asked for. The
 * merchant code is trusted first, then the name; the type overrides both when
 * it always means one thing.
 */
export function detectCategory({ transactionType, name, description, mcc }) {
  const kind = clean(transactionType).toUpperCase()
  if (ASK_TYPES.has(kind)) return null
  if (FIXED_CATEGORIES[kind]) return FIXED_CATEGORIES[kind]
  const byCode = MCC_CATEGORIES[clean(mcc)]
  if (byCode) return byCode
  const haystack = `${name} ${description}`
  for (const [pattern, category] of NAME_HINTS) if (pattern.test(haystack)) return category
  return null
}

/**
 * Reads a Trade Republic export. Rows the file does not date or amount are
 * skipped and counted, so the screen can say so rather than dropping them.
 */
export function parseTradeRepublicCsv(text) {
  const table = parseCsv(String(text ?? '').replace(/^\uFEFF/, ''))
  if (table.length < 2) return { rows: [], skipped: 0 }

  const header = table[0].map((name) => clean(name).toLowerCase())
  const column = (name) => header.indexOf(name)
  const columns = {
    datetime: column('datetime'), date: column('date'), type: column('type'),
    name: column('name'), description: column('description'),
    amount: column('amount'), mcc: column('mcc_code'), id: column('transaction_id'),
  }

  const rows = []
  let skipped = 0
  for (let index = 1; index < table.length; index++) {
    const cells = table[index]
    if (!cells || cells.every((cell) => cell === '')) continue
    const value = (key) => (columns[key] >= 0 ? clean(cells[columns[key]]) : '')

    const amount = Number(value('amount'))
    const date = toDate(value('datetime'), value('date'))
    if (!Number.isFinite(amount) || amount === 0 || !date) { skipped++; continue }

    const type = amount < 0 ? 'expense' : 'income'
    const detected = detectCategory({
      transactionType: value('type'),
      name: value('name'),
      description: value('description'),
      mcc: value('mcc'),
    })
    const transactionId = value('id')

    rows.push({
      // The file's own id, so importing the same month twice updates those rows
      // instead of doubling them.
      id: transactionId ? `tr-${transactionId}` : `tr-row-${index}`,
      title: toTitle(value('name'), value('description'), value('type')),
      // A spending category makes no sense on an income row: ask instead.
      category: type === 'income' && detected && !INCOME_CATEGORIES.has(detected) ? null : detected,
      type,
      amount: Math.abs(amount),
      date,
      platform: TRADE_REPUBLIC,
    })
  }

  return { rows, skipped }
}
