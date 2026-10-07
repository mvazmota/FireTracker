import { createContext, useContext, useMemo } from 'react'
import { authClient } from '../lib/auth-client.js'

const AuthContext = createContext(null)

/** Exposes the current session and the sign-in / sign-up / sign-out actions. */
export function AuthProvider({ children }) {
  const { data: session, isPending } = authClient.useSession()

  const value = useMemo(() => ({
    session,
    user: session?.user ?? null,
    isPending,
    signIn: (email, password) => authClient.signIn.email({ email, password }),
    signUp: (name, email, password) => authClient.signUp.email({ name, email, password }),
    signOut: () => authClient.signOut(),
  }), [session, isPending])

  return <AuthContext value={value}>{children}</AuthContext>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>')
  return context
}
