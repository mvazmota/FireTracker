/**
 * Rounds a money amount to whole cents.
 *
 * Amounts are stored and shown in euros, so every money *total* should be an
 * exact number of cents. Rounding at the boundaries — when a total is derived
 * and when it is written — keeps floating-point noise out of the database and
 * off the screen.
 *
 * Not for per-unit prices or quantities (a share price or a fractional unit
 * legitimately has more than two decimals).
 */
export function roundMoney(value) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return 0
  return Math.round((amount + Number.EPSILON) * 100) / 100
}
