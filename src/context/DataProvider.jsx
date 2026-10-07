import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from './AuthProvider.jsx'
import { api } from '../lib/api.js'
import { dateKey } from '../lib/dates.js'
import { threeYearSimulation } from '../lib/simulation.js'
import { DEFAULT_FIRE_GOAL, DEFAULT_VISIBILITY, PLATFORM_SUGGESTIONS } from '../lib/constants.js'
import { categorySuggestions } from '../data/categories.js'

const DataContext = createContext(null)

/** The shared sandbox account. It gets the starter scenario; nobody else does. */
const DEMO_EMAIL = 'demo@email.com'

/** True when the account has never stored anything. */
function isEmptyState(data) {
  return !data.profile
    && data.transactions.length === 0
    && data.etfs.length === 0
    && data.crypto.length === 0
    && data.p2p.length === 0
    && data.bonds.length === 0
    && data.savings.length === 0
}

/** The starter scenario, shaped like a POST /api/import body. */
function simulationPayload() {
  const simulation = threeYearSimulation()
  return {
    transactions: simulation.transactions,
    etfs: simulation.etfs,
    crypto: simulation.crypto,
    p2p: simulation.p2p,
    bonds: simulation.bonds,
    savings: simulation.savings,
    profile: { name: 'Demo', avatar: '', createdAt: dateKey(new Date()) },
    settings: {
      language: 'en',
      fireGoal: DEFAULT_FIRE_GOAL,
      fireMeterVisible: true,
      investmentVisibility: DEFAULT_VISIBILITY,
      platforms: PLATFORM_SUGGESTIONS,
      categories: { expense: categorySuggestions('expense'), income: categorySuggestions('income') },
      onboarded: true,
    },
  }
}

/**
 * Loads the signed-in user's data from the API and shares it with the settings
 * and finance layers below. New accounts start empty; the demo account is
 * populated with the 36-month simulation the first time it is opened.
 */
export function DataProvider({ children }) {
  const { user, isPending } = useAuth()
  const [data, setData] = useState(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(null)
  // Guards against StrictMode's double effect (and duplicate seeding).
  const startedFor = useRef(null)

  const load = useCallback(async () => {
    setReady(false)
    try {
      let next = await api.getState()
      if (user?.email === DEMO_EMAIL && isEmptyState(next)) {
        await api.importAll(simulationPayload())
        next = await api.getState()
      }
      setData(next)
      setError(null)
    } catch (cause) {
      setData(null)
      setError(cause)
    } finally {
      setReady(true)
    }
  }, [user?.email])

  useEffect(() => {
    if (isPending) return
    if (!user) {
      startedFor.current = null
      setData(null)
      setError(null)
      setReady(true)
      return
    }
    if (startedFor.current === user.id) return
    startedFor.current = user.id
    load()
  }, [isPending, user, load])

  const isDemo = user?.email === DEMO_EMAIL

  /** Wipes the demo account and restores the starter scenario. */
  const resetDemo = useCallback(async () => {
    await api.importAll(simulationPayload())
    await load()
  }, [load])

  const value = useMemo(() => ({ data, ready, error, reload: load, isDemo, resetDemo }), [data, ready, error, load, isDemo, resetDemo])
  return <DataContext value={value}>{children}</DataContext>
}

export function useData() {
  const context = useContext(DataContext)
  if (!context) throw new Error('useData must be used inside <DataProvider>')
  return context
}
