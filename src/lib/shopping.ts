import type { ShoppingItem, ShoppingTrip, ShoppingUnit } from './types'
import { coerceMoney } from './money'

export const SHOPPING_UNITS: { id: ShoppingUnit; label: string }[] = [
  { id: 'un', label: 'un' },
  { id: 'kg', label: 'kg' },
  { id: 'pct', label: 'pct' },
]

export function emptyShoppingTrip(): ShoppingTrip {
  return { budget: 0, items: [] }
}

export function shoppingEstimatedTotal(items: ShoppingItem[]): number {
  return items.reduce((sum, item) => sum + coerceMoney(item.estimatedPrice), 0)
}

export function shoppingRealTotal(items: ShoppingItem[]): number {
  return items.reduce((sum, item) => (item.inCart ? sum + coerceMoney(item.estimatedPrice) : sum), 0)
}

export function shoppingBudgetStatus(
  estimated: number,
  budget: number,
): 'ok' | 'over' | 'unset' {
  if (budget <= 0) return 'unset'
  return estimated > budget ? 'over' : 'ok'
}

export function formatShoppingQty(quantity: number, unit: ShoppingUnit): string {
  const qty = Number.isFinite(quantity) ? quantity : 0
  const text =
    unit === 'kg'
      ? qty.toLocaleString('pt-BR', { maximumFractionDigits: 3 })
      : String(Math.round(qty * 100) / 100)
  return `${text} ${unit}`
}
