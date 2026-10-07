import { betterAuth } from 'better-auth'
import { sendResetEmail } from './email.js'

/** The account's preferred language, so the reset email is written in it. */
async function userLanguage(env, userId) {
  try {
    const row = await env.DB.prepare('select "language" from "user_settings" where "userId" = ?').bind(userId).first()
    return row?.language === 'pt' ? 'pt' : 'en'
  } catch {
    return 'en'
  }
}

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
      // Sends the "choose a new password" link. Without an email provider the
      // link is logged instead, so the flow stays testable.
      sendResetPassword: async ({ user, url }) => {
        await sendResetEmail(env, { to: user.email, url, language: await userLanguage(env, user.id) })
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
    },
    ...(trustedOrigins.length ? { trustedOrigins } : {}),
  })
}
