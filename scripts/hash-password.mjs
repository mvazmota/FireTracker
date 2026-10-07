// Prints a Better Auth-compatible password hash for a given password.
// Usage: node scripts/hash-password.mjs "the-password"
import { hashPassword } from 'better-auth/crypto'

const password = process.argv[2]
if (!password) {
  console.error('Usage: node scripts/hash-password.mjs "<password>"')
  process.exit(1)
}
console.log(await hashPassword(password))
