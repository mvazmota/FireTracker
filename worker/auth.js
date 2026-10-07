import { betterAuth } from 'better-auth'

/**
 * Builds a Better Auth instance bound to this request's D1 database.
 * One instance per request — never a module-level singleton, because the D1
 * binding lives on `env`.
 */
export function createAuth(env) {
  const trustedOrigins = (env.TRUSTED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

  return betterAuth({
    database: env.DB,
    secret: env.BETTER_AUTH_SECRET,
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
    },
    ...(trustedOrigins.length ? { trustedOrigins } : {}),
  })
}
