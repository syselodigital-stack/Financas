import type { ExpenseDue, ExpenseItem, ExpenseSettlement } from './types'

export type BillPayStatus = 'PAID' | 'PENDING'
export type DueUrgency = 'OVERDUE' | 'DUE_SOON' | 'UPCOMING' | 'PAID' | 'UNSET'

export interface DueBillAlert {
  expenseId: string
  name: string
  amount: number
  dueDate: string
  month: string
  payStatus: BillPayStatus
  urgency: 'OVERDUE' | 'DUE_SOON'
  days: number
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function parseIsoDate(isoDate: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null
  const [year, month, day] = isoDate.split('-').map(Number)
  const parsed = new Date(year, month - 1, day)
  if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) return null
  return parsed
}

export function getBillPayStatus(paid: boolean): BillPayStatus {
  return paid ? 'PAID' : 'PENDING'
}

/** Dias até o vencimento: negativo = atraso. */
export function daysUntilDue(dueDate: string, today: Date = new Date()): number | null {
  const due = parseIsoDate(dueDate)
  if (!due) return null
  const ms = startOfDay(due).getTime() - startOfDay(today).getTime()
  return Math.round(ms / 86_400_000)
}

export function getDueUrgency(
  dueDate: string | null | undefined,
  paid: boolean,
  today: Date = new Date(),
): DueUrgency {
  if (paid) return 'PAID'
  if (!dueDate) return 'UNSET'
  const days = daysUntilDue(dueDate, today)
  if (days === null) return 'UNSET'
  if (days < 0) return 'OVERDUE'
  if (days <= 5) return 'DUE_SOON'
  return 'UPCOMING'
}

export function formatDueCountdown(
  dueDate: string,
  paid: boolean,
  today: Date = new Date(),
): string {
  if (paid) return 'Pago'
  const days = daysUntilDue(dueDate, today)
  if (days === null) return 'Sem vencimento'
  if (days < 0) {
    const late = Math.abs(days)
    return late === 1 ? 'Atrasado há 1 dia' : `Atrasado há ${late} dias`
  }
  if (days === 0) return 'Vence hoje'
  if (days === 1) return 'Vence em 1 dia'
  return `Vence em ${days} dias`
}

export function dueUrgencyLabel(urgency: DueUrgency): string {
  switch (urgency) {
    case 'OVERDUE':
      return 'Atrasado'
    case 'DUE_SOON':
      return 'Prestes a vencer'
    case 'UPCOMING':
      return 'A vencer'
    case 'PAID':
      return 'Pago'
    default:
      return 'Sem data'
  }
}

export function dueUrgencyBadgeClass(urgency: DueUrgency): string {
  switch (urgency) {
    case 'OVERDUE':
      return 'bg-alert/15 text-alert ring-1 ring-alert/30'
    case 'DUE_SOON':
      return 'bg-[#f3e0c2] text-[#9a5b2f] ring-1 ring-[#d4a574]/60'
    case 'PAID':
      return 'bg-sage/20 text-teal-deep ring-1 ring-sage/40'
    case 'UPCOMING':
      return 'bg-foam text-teal ring-1 ring-line'
    default:
      return 'bg-paper text-muted ring-1 ring-line'
  }
}

/** Ordena: com data mais próxima primeiro; sem data no fim. */
export function compareByDueDate(left: string | undefined, right: string | undefined): number {
  if (!left && !right) return 0
  if (!left) return 1
  if (!right) return -1
  return left.localeCompare(right)
}

export function buildDueBillAlerts(
  expenses: ExpenseItem[],
  dues: ExpenseDue[],
  settlements: ExpenseSettlement[],
  today: Date = new Date(),
): DueBillAlert[] {
  const byId = new Map(expenses.map((expense) => [expense.id, expense]))
  const paidKeys = new Set(
    settlements.filter((item) => item.paid).map((item) => `${item.month}:${item.expenseId}`),
  )

  const alerts: DueBillAlert[] = []
  for (const due of dues) {
    const expense = byId.get(due.expenseId)
    if (!expense || expense.amount <= 0) continue
    const paid = paidKeys.has(`${due.month}:${due.expenseId}`)
    const urgency = getDueUrgency(due.date, paid, today)
    if (urgency !== 'OVERDUE' && urgency !== 'DUE_SOON') continue
    const days = daysUntilDue(due.date, today)
    if (days === null) continue
    alerts.push({
      expenseId: due.expenseId,
      name: expense.name || 'Conta',
      amount: expense.amount,
      dueDate: due.date,
      month: due.month,
      payStatus: getBillPayStatus(paid),
      urgency,
      days,
    })
  }

  return alerts.sort((a, b) => {
    if (a.urgency !== b.urgency) return a.urgency === 'OVERDUE' ? -1 : 1
    return a.dueDate.localeCompare(b.dueDate) || a.name.localeCompare(b.name, 'pt-BR')
  })
}
