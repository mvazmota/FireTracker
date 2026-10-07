import { Bitcoin, ChartLine, HandCoins, Landmark, Wallet } from 'lucide-react'

/**
 * The investment spaces, in display order. `key` doubles as the i18n label key
 * (t.etfs, t.crypto, …) and as the visibility flag in `investmentVisibility`.
 */
export const INVESTMENT_TYPES = [
  { key: 'etfs', icon: ChartLine, tint: 'etf-tint' },
  { key: 'crypto', icon: Bitcoin, tint: 'crypto-tint' },
  { key: 'p2p', icon: HandCoins, tint: 'p2p-tint' },
  { key: 'bonds', icon: Landmark, tint: 'bonds-tint' },
  { key: 'savings', icon: Wallet, tint: 'savings-tint' },
]
