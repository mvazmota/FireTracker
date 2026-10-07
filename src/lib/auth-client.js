import { createAuthClient } from 'better-auth/react'

// No baseURL: requests are relative, so they hit the same origin as the app
// (the Worker in production, the Vite proxy in development).
export const authClient = createAuthClient()
