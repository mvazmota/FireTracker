import { Hono } from 'hono'
import { fetchFundFacts, fetchPrices, isIsin, readCatalog, readPrices, resolveIsin, writeCatalog, writePrices } from './etf.js'
import { ASSET_TABLES, RECURRING, TRANSACTIONS, clearUserRows, listForUser, removeById, roundCents, runBatched, upsert, upsertStatement } from './tables.js'

const SETTINGS_COLUMNS = ['name', 'avatar', 'createdAt', 'language', 'fireMeterVisible', 'investmentVisibility', 'platforms', 'categories', 'onboarded', 'fireEstimate', 'firePlan', 'birthYear', 'country']

const jsonOrNull = (value) => (value == null ? null : JSON.stringify(value))
const parseOrNull = (value) => {
  if (value == null) return null
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

async function loadSettings(db, userId) {
  const row = await db.prepare('select * from "user_settings" where "userId" = ?').bind(userId).first()
  if (!row) return { profile: null, settings: null }
  return {
    profile: { name: row.name ?? '', avatar: row.avatar ?? '', createdAt: row.createdAt ?? '' },
    settings: {
      language: row.language ?? undefined,
      fireMeterVisible: row.fireMeterVisible == null ? undefined : Boolean(row.fireMeterVisible),
      investmentVisibility: parseOrNull(row.investmentVisibility) ?? undefined,
      platforms: parseOrNull(row.platforms) ?? undefined,
      categories: parseOrNull(row.categories) ?? undefined,
      onboarded: row.onboarded == null ? undefined : Boolean(row.onboarded),
      fireEstimate: parseOrNull(row.fireEstimate) ?? undefined,
      firePlan: parseOrNull(row.firePlan) ?? undefined,
      birthYear: row.birthYear ?? undefined,
      country: row.country ?? undefined,
    },
  }
}

async function saveSettings(db, userId, body) {
  const existing = await db.prepare('select * from "user_settings" where "userId" = ?').bind(userId).first()
  const merged = {
    name: body?.profile?.name ?? existing?.name ?? '',
    avatar: body?.profile?.avatar ?? existing?.avatar ?? '',
    createdAt: body?.profile?.createdAt ?? existing?.createdAt ?? new Date().toISOString().slice(0, 10),
    language: body?.settings?.language ?? existing?.language ?? 'en',
    fireMeterVisible: body?.settings?.fireMeterVisible ?? (existing?.fireMeterVisible == null ? true : Boolean(existing.fireMeterVisible)),
    investmentVisibility: body?.settings?.investmentVisibility ?? parseOrNull(existing?.investmentVisibility) ?? null,
    platforms: body?.settings?.platforms ?? parseOrNull(existing?.platforms) ?? null,
    categories: body?.settings?.categories ?? parseOrNull(existing?.categories) ?? null,
    onboarded: body?.settings?.onboarded ?? (existing?.onboarded == null ? null : Boolean(existing.onboarded)),
    fireEstimate: body?.settings?.fireEstimate ?? parseOrNull(existing?.fireEstimate) ?? null,
    firePlan: body?.settings?.firePlan ?? parseOrNull(existing?.firePlan) ?? null,
    birthYear: body?.settings?.birthYear ?? existing?.birthYear ?? null,
    country: body?.settings?.country ?? existing?.country ?? null,
  }
  const values = [
    userId,
    merged.name,
    merged.avatar,
    merged.createdAt,
    merged.language,
    merged.fireMeterVisible ? 1 : 0,
    jsonOrNull(merged.investmentVisibility),
    jsonOrNull(merged.platforms),
    jsonOrNull(merged.categories),
    merged.onboarded ? 1 : 0,
    jsonOrNull(merged.fireEstimate),
    jsonOrNull(merged.firePlan),
    merged.birthYear,
    merged.country,
  ]
  const columns = ['userId', ...SETTINGS_COLUMNS]
  const assignments = SETTINGS_COLUMNS.map((column) => `"${column}" = excluded."${column}"`).join(', ')
  await db
    .prepare(`insert into "user_settings" (${columns.map((c) => `"${c}"`).join(', ')}) values (${columns.map(() => '?').join(', ')}) on conflict("userId") do update set ${assignments}`)
    .bind(...values)
    .run()
}

export const api = new Hono()

api.use('*', async (c, next) => {
  const session = await c.get('auth').api.getSession({ headers: c.req.raw.headers })
  if (!session?.user) return c.json({ error: 'unauthorized' }, 401)
  c.set('userId', session.user.id)
  await next()
})

/** Everything the client needs on load. */
api.get('/state', async (c) => {
  const db = c.env.DB
  const userId = c.get('userId')
  const [transactions, etfs, crypto, p2p, bonds, savings, recurring] = await Promise.all([
    listForUser(db, userId, TRANSACTIONS),
    listForUser(db, userId, ASSET_TABLES.etfs),
    listForUser(db, userId, ASSET_TABLES.crypto),
    listForUser(db, userId, ASSET_TABLES.p2p),
    listForUser(db, userId, ASSET_TABLES.bonds),
    listForUser(db, userId, ASSET_TABLES.savings),
    listForUser(db, userId, RECURRING),
  ])
  const { profile, settings } = await loadSettings(db, userId)
  return c.json({ transactions, etfs, crypto, p2p, bonds, savings, recurring, profile, settings })
})

api.put('/transactions/:id', async (c) => {
  const body = await c.req.json()
  const record = { ...body, id: c.req.param('id') }
  if (!record.title || !record.category || !record.type || !record.date) return c.json({ error: 'invalid transaction' }, 400)
  await upsert(c.env.DB, c.get('userId'), TRANSACTIONS, record)
  return c.json({ ok: true })
})

api.delete('/transactions/:id', async (c) => {
  await removeById(c.env.DB, c.get('userId'), TRANSACTIONS, c.req.param('id'))
  return c.json({ ok: true })
})

api.put('/assets/:type/:id', async (c) => {
  const config = ASSET_TABLES[c.req.param('type')]
  if (!config) return c.json({ error: 'unknown asset type' }, 400)
  const body = await c.req.json()
  await upsert(c.env.DB, c.get('userId'), config, { ...body, id: c.req.param('id') })
  return c.json({ ok: true })
})

api.delete('/assets/:type/:id', async (c) => {
  const config = ASSET_TABLES[c.req.param('type')]
  if (!config) return c.json({ error: 'unknown asset type' }, 400)
  await removeById(c.env.DB, c.get('userId'), config, c.req.param('id'))
  return c.json({ ok: true })
})

api.put('/recurring/:id', async (c) => {
  const body = await c.req.json()
  const record = { ...body, id: c.req.param('id') }
  if (!record.title || !record.category || !record.type || !record.startMonth) return c.json({ error: 'invalid rule' }, 400)
  await upsert(c.env.DB, c.get('userId'), RECURRING, record)
  return c.json({ ok: true })
})

api.delete('/recurring/:id', async (c) => {
  await removeById(c.env.DB, c.get('userId'), RECURRING, c.req.param('id'))
  return c.json({ ok: true })
})

api.put('/settings', async (c) => {
  await saveSettings(c.env.DB, c.get('userId'), await c.req.json())
  return c.json({ ok: true })
})

/**
 * Erases the signed-in account and everything belonging to it. The auth rows
 * are deleted explicitly rather than relying on the cascades, so the account
 * disappears even if foreign keys are not enforced.
 */
api.delete('/account', async (c) => {
  const db = c.env.DB
  const userId = c.get('userId')
  await clearUserRows(db, userId)
  await db.batch([
    db.prepare('delete from "user_settings" where "userId" = ?').bind(userId),
    db.prepare('delete from "session" where "userId" = ?').bind(userId),
    db.prepare('delete from "account" where "userId" = ?').bind(userId),
    db.prepare('delete from "user" where "id" = ?').bind(userId),
  ])
  return c.json({ ok: true })
})

/**
 * Resolves an ISIN to the fund behind it, so a holding can be added with just
 * the ISIN rather than its name, ticker and currency.
 */
api.get('/etf/lookup', async (c) => {
  const isin = (c.req.query('isin') || '').trim().toUpperCase()
  if (!isIsin(isin)) return c.json({ error: 'invalid_isin' }, 400)

  const cached = await readCatalog(c.env.DB, isin)
  if (cached) return c.json(cached)

  try {
    const found = await resolveIsin(isin)
    if (!found) return c.json({ error: 'not_found' }, 404)

    // The fund facts are a bonus: a holding works without them, so a failure
    // here must not fail the lookup.
    let facts = null
    try {
      facts = await fetchFundFacts(found.symbol, found.name)
    } catch {
      facts = null
    }

    const entry = { ...found, ...(facts || {}) }
    await writeCatalog(c.env.DB, entry)
    return c.json(entry)
  } catch {
    // The feed is undocumented and can fail; the client falls back to manual entry.
    return c.json({ error: 'lookup_failed' }, 502)
  }
})

/** Daily closes for a fund from a date onwards, cached for a day. */
api.get('/etf/prices', async (c) => {
  const symbol = (c.req.query('symbol') || '').trim()
  const from = (c.req.query('from') || '').trim()
  if (!symbol || !/^\d{4}-\d{2}-\d{2}$/.test(from)) return c.json({ error: 'invalid_request' }, 400)

  const cached = await readPrices(c.env.DB, symbol)
  if (cached) return c.json(cached)

  try {
    const series = await fetchPrices(symbol, from)
    await writePrices(c.env.DB, symbol, series.rows)
    return c.json(series)
  } catch {
    return c.json({ error: 'prices_failed' }, 502)
  }
})

/**
 * Bulk import — used to seed the demo account and to restore it. Statements are
 * batched so importing hundreds of rows takes a few round trips, not hundreds.
 */
api.post('/import', async (c) => {
  const db = c.env.DB
  const userId = c.get('userId')
  const body = await c.req.json()
  await clearUserRows(db, userId)
  const statements = []
  for (const type of Object.keys(ASSET_TABLES)) {
    for (const record of body[type] || []) statements.push(upsertStatement(db, userId, ASSET_TABLES[type], record))
  }
  for (const record of body.transactions || []) statements.push(upsertStatement(db, userId, TRANSACTIONS, record))
  for (const record of body.recurring || []) statements.push(upsertStatement(db, userId, RECURRING, record))
  await runBatched(db, statements)
  await saveSettings(db, userId, { profile: body.profile, settings: body.settings })
  return c.json({ ok: true })
})
