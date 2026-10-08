import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from './AuthProvider.jsx'
import { api } from '../lib/api.js'
import { buildDemoPayload } from '../lib/demo/build.js'
import { demoPersonaFor } from '../lib/demo/personas.js'

const DataContext = createContext(null)

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

/**
 * Loads the signed-in user's data from the API and shares it with the settings
 * and finance layers below. New accounts start empty; a demo account is filled
 * with its persona's history the first time it is opened.
 */
export function DataProvider({ children }) {
  const { user, isPending } = useAuth()
  const [data, setData] = useState(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(null)
  // Guards against StrictMode's double effect (and duplicate seeding).
  const startedFor = useRef(null)

  const load = useCallback(async () => {
    const persona = demoPersonaFor(user?.email)
    setReady(false)
    try {
      let next = await api.getState()
      if (persona && isEmptyState(next)) {
        await api.importAll(buildDemoPayload(persona))
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

  const isDemo = Boolean(demoPersonaFor(user?.email))

  /** Wipes a demo account and restores its persona. */
  const resetDemo = useCallback(async () => {
    const persona = demoPersonaFor(user?.email)
    if (!persona) return
    await api.importAll(buildDemoPayload(persona))
    await load()
  }, [load, user?.email])

  const value = useMemo(() => ({ data, ready, error, reload: load, isDemo, resetDemo }), [data, ready, error, load, isDemo, resetDemo])
  return <DataContext value={value}>{children}</DataContext>
}

export function useData() {
  const context = useContext(DataContext)
  if (!context) throw new Error('useData must be used inside <DataProvider>')
  return context
}
