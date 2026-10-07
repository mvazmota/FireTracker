import { ChartLine, CreditCard, Film, ForkKnife, Gift, HeartPulse, House, ShoppingBag, Sparkles, Tag, Wallet } from 'lucide-react'

/** Built-in categories with their icon and accent colour. */
export const categories = {
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

export function categoryInfo(name, type = 'expense') {
  const list = categories[type] || categories.expense
  return list.find((item) => item.name === name) || categories.expense.at(-1)
}
