// Storage keys and shared constants for Firepath.

export const STORAGE_KEY = 'sprout-finance-transactions-v1'
export const INVESTMENT_STORAGE_KEY = 'sprout-finance-etfs-v1'
export const CRYPTO_STORAGE_KEY = 'sprout-finance-crypto-v1'
export const P2P_STORAGE_KEY = 'sprout-finance-p2p-v1'
export const BONDS_STORAGE_KEY = 'sprout-finance-bonds-v1'
export const SAVINGS_STORAGE_KEY = 'sprout-finance-savings-v1'
export const FIRE_GOAL_STORAGE_KEY = 'sprout-fire-goal-v1'
export const LANGUAGE_KEY = 'sprout-finance-language-v1'
export const PLATFORMS_STORAGE_KEY = 'firepath-platforms-v1'
export const CUSTOM_CATEGORIES_STORAGE_KEY = 'firepath-custom-categories-v1'
export const PROFILE_STORAGE_KEY = 'firepath-user-profile-v1'
export const VISIBILITY_STORAGE_KEY = 'firepath-investment-visibility-v1'
export const SIMULATION_VERSION_KEY = 'firepath-simulation-version-v1'

export const SIMULATION_VERSION = 'three-year-fire-simulation-v3'
export const DEFAULT_FIRE_GOAL = 300000

export const DEFAULT_PLATFORMS = [
  'Bank account',
  'Cash',
  'Trade Republic',
  'Interactive Brokers',
  'DEGIRO',
  'Coinbase',
  'Kraken',
  'Mintos',
  'PeerBerry',
  'Banco Invest',
]

/** Investment spaces, in display order. */
export const ASSET_TYPES = ['etfs', 'crypto', 'p2p', 'bonds', 'savings']

/** Categories that represent moving money into an asset rather than spending it. */
export const INVESTMENT_CATEGORIES = ['Investment', 'Investments']

export const DEFAULT_VISIBILITY = { etfs: true, crypto: true, p2p: true, bonds: true, savings: true }

/** Platform used for seeded demo records, per asset type. */
export const DEMO_PLATFORM_BY_TYPE = {
  etfs: 'Trade Republic',
  crypto: 'Coinbase',
  p2p: 'Mintos',
  bonds: 'Banco Invest',
  savings: 'Bank account',
}
