import { dateKey, normalizeTransactionDate } from './dates.js'
import { DEFAULT_FIRE_GOAL, DEFAULT_PLATFORMS, DEFAULT_VISIBILITY, DEMO_PLATFORM_BY_TYPE, SIMULATION_VERSION, SIMULATION_VERSION_KEY, STORAGE_KEY, INVESTMENT_STORAGE_KEY, CRYPTO_STORAGE_KEY, P2P_STORAGE_KEY, BONDS_STORAGE_KEY, SAVINGS_STORAGE_KEY, FIRE_GOAL_STORAGE_KEY, FIRE_METER_STORAGE_KEY, PLATFORMS_STORAGE_KEY, CUSTOM_CATEGORIES_STORAGE_KEY, PROFILE_STORAGE_KEY, VISIBILITY_STORAGE_KEY } from './constants.js'
import { demoBonds, demoCrypto, demoInvestments, demoP2P, demoSavings, demoTransactions, threeYearSimulation } from './simulation.js'

/** Safe JSON read. Returns `fallback` when storage is unavailable or corrupt. */
export function readJSON(key, fallback = null) {
  try {
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : fallback
  } catch {
    return fallback
  }
}

/** Safe JSON write. Silently ignores quota or privacy-mode failures. */
export function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

/** Assigns a platform to seeded demo records that predate the platform field. */
export function normalizeDemoPlatforms(records, platform) {
  return records.map((record) => (record.isDemo && !record.platform ? { ...record, platform } : record))
}

/** Seeds the starter scenario once per SIMULATION_VERSION. */
export function ensureSimulationSeeded() {
  try {
    if (localStorage.getItem(SIMULATION_VERSION_KEY) === SIMULATION_VERSION) return
    const simulation = threeYearSimulation()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(simulation.transactions))
    localStorage.setItem(INVESTMENT_STORAGE_KEY, JSON.stringify(simulation.etfs))
    localStorage.setItem(CRYPTO_STORAGE_KEY, JSON.stringify(simulation.crypto))
    localStorage.setItem(P2P_STORAGE_KEY, JSON.stringify(simulation.p2p))
    localStorage.setItem(BONDS_STORAGE_KEY, JSON.stringify(simulation.bonds))
    localStorage.setItem(SAVINGS_STORAGE_KEY, JSON.stringify(simulation.savings))
    localStorage.setItem(SIMULATION_VERSION_KEY, SIMULATION_VERSION)
  } catch {
    // Continue with the in-memory simulation when local storage is unavailable.
  }
}

export function loadTransactions() {
  ensureSimulationSeeded()
  const transactions = readJSON(STORAGE_KEY) ?? demoTransactions()
  return transactions.map((item) => ({ ...item, date: normalizeTransactionDate(item.date) }))
}

export function loadInvestments() {
  ensureSimulationSeeded()
  return normalizeDemoPlatforms(readJSON(INVESTMENT_STORAGE_KEY) ?? demoInvestments(), DEMO_PLATFORM_BY_TYPE.etfs)
}

export function loadCollection(key, fallback, platform) {
  ensureSimulationSeeded()
  return normalizeDemoPlatforms(readJSON(key) ?? fallback(), platform)
}

export function loadCrypto() {
  return loadCollection(CRYPTO_STORAGE_KEY, demoCrypto, DEMO_PLATFORM_BY_TYPE.crypto)
}

export function loadP2P() {
  return loadCollection(P2P_STORAGE_KEY, demoP2P, DEMO_PLATFORM_BY_TYPE.p2p)
}

export function loadBonds() {
  return loadCollection(BONDS_STORAGE_KEY, demoBonds, DEMO_PLATFORM_BY_TYPE.bonds)
}

export function loadSavingsAccounts() {
  ensureSimulationSeeded()
  const accounts = readJSON(SAVINGS_STORAGE_KEY) ?? (readJSON(STORAGE_KEY) ? [] : demoSavings())
  return accounts.map((account) => (account.isDemo && !account.institution ? { ...account, institution: DEMO_PLATFORM_BY_TYPE.savings } : account))
}

export function loadFireGoal() {
  const stored = Number(readJSON(FIRE_GOAL_STORAGE_KEY))
  return Number.isFinite(stored) && stored > 0 ? stored : DEFAULT_FIRE_GOAL
}

/** Every platform seen so far, merged with the defaults. */
export function loadPlatforms() {
  const stored = readJSON(PLATFORMS_STORAGE_KEY, [])
  const fromTransactions = (readJSON(STORAGE_KEY, []) || []).map((item) => item.platform).filter(Boolean)
  const fromAssets = [INVESTMENT_STORAGE_KEY, CRYPTO_STORAGE_KEY, P2P_STORAGE_KEY, BONDS_STORAGE_KEY]
    .flatMap((key) => (readJSON(key, []) || []).map((item) => item.platform).filter(Boolean))
  const fromSavings = (readJSON(SAVINGS_STORAGE_KEY, []) || []).map((item) => item.institution).filter(Boolean)
  return [...new Set([...DEFAULT_PLATFORMS, ...(Array.isArray(stored) ? stored : []), ...fromTransactions, ...fromAssets, ...fromSavings])]
}

export function loadCustomCategories() {
  const stored = readJSON(CUSTOM_CATEGORIES_STORAGE_KEY, {}) || {}
  return {
    expense: Array.isArray(stored.expense) ? stored.expense : [],
    income: Array.isArray(stored.income) ? stored.income : [],
  }
}

export function loadUserProfile() {
  const stored = readJSON(PROFILE_STORAGE_KEY)
  if (stored) return stored
  const profile = { name: '', createdAt: dateKey(new Date()) }
  writeJSON(PROFILE_STORAGE_KEY, profile)
  return profile
}

/** Whether the compact FIRE meter appears in the sidebar. Defaults to on. */
export function loadFireMeterVisible() {
  return readJSON(FIRE_METER_STORAGE_KEY, true) !== false
}

export function loadInvestmentVisibility() {
  const stored = readJSON(VISIBILITY_STORAGE_KEY, {}) || {}
  return Object.fromEntries(Object.keys(DEFAULT_VISIBILITY).map((key) => [key, stored[key] !== false]))
}
