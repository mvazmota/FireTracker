// Maps the client-side object shapes onto D1 columns.
// History arrays are stored as JSON text; booleans as 0/1.

/** Rounds a money total to whole cents; leaves null and non-numbers alone. */
export const roundCents = (value) => {
  const amount = Number(value)
  if (value == null || !Number.isFinite(amount)) return value
  return Math.round((amount + Number.EPSILON) * 100) / 100
}

/**
 * Columns that hold a money total. Per-unit prices (averageCost, currentPrice)
 * and quantities (units) are deliberately excluded — they legitimately need
 * more than two decimals.
 */
const MONEY_COLUMNS = {
  transactions: ['amount', 'flowDelta'],
  recurring_rules: ['amount'],
  p2p: ['invested', 'currentValue'],
  bonds: ['nominalValue', 'investedValue', 'currentValue'],
  savings: ['balance', 'target'],
}

const toJson = (value) => (value == null ? null : JSON.stringify(value))
const fromJson = (value) => {
  if (value == null) return undefined
  try {
    return JSON.parse(value)
  } catch {
    return undefined
  }
}
const toBool = (value) => (value == null ? null : value ? 1 : 0)

export const ASSET_TABLES = {
  etfs: {
    table: 'etfs',
    columns: ['id', 'isin', 'symbol', 'name', 'platform', 'units', 'averageCost', 'currentPrice', 'history', 'isDemo'],
    toRow: (r) => [r.id, r.isin ?? null, r.symbol, r.name, r.platform ?? null, r.units, r.averageCost, r.currentPrice, toJson(r.history), toBool(r.isDemo)],
    fromRow: (r) => ({ id: r.id, isin: r.isin ?? undefined, symbol: r.symbol, name: r.name, platform: r.platform ?? undefined, units: r.units, averageCost: r.averageCost, currentPrice: r.currentPrice, history: fromJson(r.history) ?? [], isDemo: Boolean(r.isDemo) }),
  },
  crypto: {
    table: 'crypto',
    columns: ['id', 'symbol', 'name', 'platform', 'units', 'averageCost', 'currentPrice', 'history', 'isDemo'],
    toRow: (r) => [r.id, r.symbol, r.name, r.platform ?? null, r.units, r.averageCost, r.currentPrice, toJson(r.history), toBool(r.isDemo)],
    fromRow: (r) => ({ id: r.id, symbol: r.symbol, name: r.name, platform: r.platform ?? undefined, units: r.units, averageCost: r.averageCost, currentPrice: r.currentPrice, history: fromJson(r.history) ?? [], isDemo: Boolean(r.isDemo) }),
  },
  p2p: {
    table: 'p2p',
    columns: ['id', 'platform', 'name', 'invested', 'currentValue', 'annualRate', 'history', 'isDemo'],
    toRow: (r) => [r.id, r.platform ?? null, r.name, r.invested, r.currentValue, r.annualRate ?? 0, toJson(r.history), toBool(r.isDemo)],
    fromRow: (r) => ({ id: r.id, platform: r.platform ?? undefined, name: r.name, invested: r.invested, currentValue: r.currentValue, annualRate: r.annualRate ?? 0, history: fromJson(r.history) ?? [], isDemo: Boolean(r.isDemo) }),
  },
  bonds: {
    table: 'bonds',
    columns: ['id', 'name', 'issuer', 'platform', 'nominalValue', 'investedValue', 'currentValue', 'couponRate', 'maturityDate', 'history', 'isDemo'],
    toRow: (r) => [r.id, r.name, r.issuer ?? null, r.platform ?? null, r.nominalValue ?? 0, r.investedValue, r.currentValue, r.couponRate ?? 0, r.maturityDate ?? null, toJson(r.history), toBool(r.isDemo)],
    fromRow: (r) => ({ id: r.id, name: r.name, issuer: r.issuer ?? undefined, platform: r.platform ?? undefined, nominalValue: r.nominalValue ?? 0, investedValue: r.investedValue, currentValue: r.currentValue, couponRate: r.couponRate ?? 0, maturityDate: r.maturityDate ?? undefined, history: fromJson(r.history) ?? [], isDemo: Boolean(r.isDemo) }),
  },
  savings: {
    table: 'savings_accounts',
    columns: ['id', 'name', 'institution', 'balance', 'target', 'annualRate', 'history', 'isDemo'],
    toRow: (r) => [r.id, r.name, r.institution ?? null, r.balance, r.target ?? null, r.annualRate ?? 0, toJson(r.history), toBool(r.isDemo)],
    fromRow: (r) => ({ id: r.id, name: r.name, institution: r.institution ?? undefined, balance: r.balance, target: r.target ?? undefined, annualRate: r.annualRate ?? 0, history: fromJson(r.history) ?? [], isDemo: Boolean(r.isDemo) }),
  },
}

export const RECURRING = {
  table: 'recurring_rules',
  columns: ['id', 'title', 'category', 'type', 'amount', 'platform', 'dayOfMonth', 'startMonth', 'lastGeneratedMonth', 'active'],
  toRow: (r) => [r.id, r.title, r.category, r.type, r.amount, r.platform ?? null, r.dayOfMonth, r.startMonth, r.lastGeneratedMonth ?? null, toBool(r.active ?? true)],
  fromRow: (r) => ({ id: r.id, title: r.title, category: r.category, type: r.type, amount: r.amount, platform: r.platform ?? '', dayOfMonth: r.dayOfMonth, startMonth: r.startMonth, lastGeneratedMonth: r.lastGeneratedMonth ?? null, active: Boolean(r.active) }),
}

export const TRANSACTIONS = {
  table: 'transactions',
  columns: ['id', 'title', 'category', 'type', 'amount', 'date', 'platform', 'sourceType', 'sourceId', 'investmentType', 'flowDelta', 'isDemo'],
  toRow: (r) => [r.id, r.title, r.category, r.type, r.amount, r.date, r.platform ?? null, r.sourceType ?? null, r.sourceId ?? null, r.investmentType ?? null, r.flowDelta ?? null, toBool(r.isDemo)],
  fromRow: (r) => ({ id: r.id, title: r.title, category: r.category, type: r.type, amount: r.amount, date: r.date, platform: r.platform ?? '', sourceType: r.sourceType ?? undefined, sourceId: r.sourceId ?? undefined, investmentType: r.investmentType ?? undefined, flowDelta: r.flowDelta ?? undefined, isDemo: Boolean(r.isDemo) }),
}

/** Builds (but does not run) the upsert for a row, scoped to the given user. */
export function upsertStatement(db, userId, config, record) {
  const columns = ['userId', ...config.columns]
  const money = MONEY_COLUMNS[config.table] || []
  const values = [userId, ...config.toRow(record).map((value, index) => (money.includes(config.columns[index]) ? roundCents(value) : value))]
  const placeholders = columns.map(() => '?').join(', ')
  const assignments = config.columns
    .filter((column) => column !== 'id')
    .map((column) => `"${column}" = excluded."${column}"`)
    .join(', ')
  const sql = `insert into "${config.table}" (${columns.map((c) => `"${c}"`).join(', ')}) values (${placeholders}) on conflict("id") do update set ${assignments}`
  return db.prepare(sql).bind(...values)
}

/** Inserts or updates a row, scoped to the given user. */
export async function upsert(db, userId, config, record) {
  await upsertStatement(db, userId, config, record).run()
}

/**
 * Runs prepared statements in chunks. `db.batch` sends each chunk in a single
 * round trip, which matters for bulk imports of hundreds of rows.
 */
export async function runBatched(db, statements, chunkSize = 100) {
  for (let index = 0; index < statements.length; index += chunkSize) {
    await db.batch(statements.slice(index, index + chunkSize))
  }
}

export async function removeById(db, userId, config, id) {
  await db.prepare(`delete from "${config.table}" where "id" = ? and "userId" = ?`).bind(id, userId).run()
}

export async function listForUser(db, userId, config) {
  const { results } = await db.prepare(`select * from "${config.table}" where "userId" = ?`).bind(userId).all()
  return (results || []).map(config.fromRow)
}

export async function clearUserRows(db, userId) {
  const tables = ['transactions', RECURRING.table, ...Object.values(ASSET_TABLES).map((c) => c.table)]
  await db.batch(tables.map((table) => db.prepare(`delete from "${table}" where "userId" = ?`).bind(userId)))
}
