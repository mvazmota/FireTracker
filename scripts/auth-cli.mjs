// Config used only by the Better Auth CLI to generate the database schema.
// It mirrors the auth-relevant options in ../worker/auth.js but uses a local
// SQLite database so it can run outside the Workers runtime.
//
// Regenerate with:
//   npx @better-auth/cli generate --config ./scripts/auth-cli.mjs --output ./worker/db/auth-schema.sql -y
import { betterAuth } from 'better-auth'
import Database from 'better-sqlite3'

export const auth = betterAuth({
  database: new Database(':memory:'),
  secret: 'schema-generation-only-not-a-real-secret',
  emailAndPassword: { enabled: true },
})
