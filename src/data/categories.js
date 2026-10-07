import { ChartLine, CreditCard, Film, ForkKnife, Gift, HeartPulse, House, ShoppingBag, Sparkles, Tag, Wallet } from 'lucide-react'

/**
 * The built-in catalogue. It is not the user's category list: each account
 * stores its own selection in `user_settings.categories`. This catalogue only
 * provides the suggestions offered during onboarding, plus the icon and accent
 * colour for any name we recognise.
 */
export const categoryCatalogue = {
  expense: [
    { name: 'Food & dining', icon: ForkKnife, color: '#efa77c' },
    { name: 'Investment', icon: ChartLine, color: '#78a7bd' },
    { name: 'Savings', icon: Wallet, color: '#8aa979' },
    { name: 'Transport', icon: CreditCard, color: '#89a9da' },
    { name: 'Shopping', icon: ShoppingBag, color: '#ad9be0' },
    { name: 'Housing', icon: House, color: '#78b7a0' },
    { name: 'Health', icon: HeartPulse, color: '#df89a0' },
    { name: 'Entertainment', icon: Film, color: '#e7c46f' },
    { name: 'Other', icon: Tag, color: '#aab3b1' },
  ],
  income: [
    { name: 'Salary', icon: Wallet, color: '#78b7a0' },
    { name: 'Freelance', icon: Sparkles, color: '#89a9da' },
    { name: 'Gift', icon: Gift, color: '#df89a0' },
    { name: 'Other', icon: Tag, color: '#aab3b1' },
  ],
}

export const CATEGORY_TYPES = ['expense', 'income']

/** Names offered as suggestions, in catalogue order. */
export function categorySuggestions(type) {
  return (categoryCatalogue[type] || []).map((item) => item.name)
}

/** Icon and colour for a category name; unknown names fall back to "Other". */
export function categoryInfo(name, type = 'expense') {
  const list = categoryCatalogue[type] || categoryCatalogue.expense
  return list.find((item) => item.name === name) || categoryCatalogue.expense.at(-1)
}
