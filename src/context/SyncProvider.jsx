import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'

const SyncContext = createContext(null)

/**
 * Tracks background writes so the UI can be honest about whether changes are
 * saved. Failed operations are queued so the user can retry them instead of the
 * failure disappearing silently.
 */
export function SyncProvider({ children }) {
  const [pending, setPending] = useState(0)
  const [failed, setFailed] = useState([])

  // Writes run one after another. Several endpoints replace a whole row, so two
  // overlapping writes could lose the earlier one's fields.
  const queue = useRef(Promise.resolve())

  /** Runs a write, counting it while in flight and queueing it if it fails. */
  const run = useCallback((operation) => {
    setPending((count) => count + 1)
    const next = queue.current
      .then(operation)
      .catch(() => {
        setFailed((list) => [...list, operation])
        return null
      })
      .finally(() => setPending((count) => count - 1))
    queue.current = next
    return next
  }, [])

  const retry = useCallback(() => {
    const queue = failed
    setFailed([])
    queue.forEach((operation) => run(operation))
  }, [failed, run])

  const dismiss = useCallback(() => setFailed([]), [])

  const value = useMemo(() => ({
    run,
    retry,
    dismiss,
    failedCount: failed.length,
    status: failed.length ? 'error' : pending > 0 ? 'saving' : 'saved',
  }), [run, retry, dismiss, pending, failed.length])

  return <SyncContext value={value}>{children}</SyncContext>
}

export function useSync() {
  const context = useContext(SyncContext)
  if (!context) throw new Error('useSync must be used inside <SyncProvider>')
  return context
}
