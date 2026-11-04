import type { AllocationResult, AppState, DailyExpense, ExpenseItem, MonthClosing, ProjectionPoint } from './types'
import { fromCents, monthsOfYear, monthLabel, monthShort, previousMonthKey, toCents, yearOf } from './money'
import { sortedCategories } from './defaults'

export const CARRYOVER_DEBT_ID = 'saldo-devedor-acumulado'

/**
 * Saldo transitado do mês anterior registrado.
 * Positivo = sobra; negativo = sombra (déficit) a cobrir; 0 se não houver fechamento.
 */
export function carriedForwardBalance(closings: MonthClosing[] | undefined, activeMonth: string): number {
  const previous = previousMonthKey(activeMonth)
  const closing = (closings ?? []).find((item) => item.month === previous)
  if (!closing) return 0
  const sobraCents = toCents(closing.sobra)
  if (sobraCents > 0) return fromCents(sobraCents)
  const sombraCents = toCents(closing.sombra)
  if (sombraCents > 0) return fromCents(-sombraCents)
  return 0
}

/** @deprecated use carriedForwardBalance */
export function carriedForwardSobra(closings: MonthClosing[] | undefined, activeMonth: string): number {
  return Math.max(0, carriedForwardBalance(closings, activeMonth))
}

function dailyCentsByCategory(entries: DailyExpense[], month: string): Map<string, number> {
  const totals = new Map<string, number>()
  for (const entry of entries) {
    if (!entry.date.startsWith(month)) continue
    totals.set(entry.categoryId, (totals.get(entry.categoryId) ?? 0) + toCents(entry.amount))
  }
  return totals
}

function orderedExpenses(expenses: ExpenseItem[]): ExpenseItem[] {
  return expenses
    .map((expense, index) => ({ expense, index }))
    .sort((a, b) => a.expense.priority - b.expense.priority || a.index - b.index)
    .map((item) => item.expense)
}

export function allocate(
  state: Pick<AppState, 'categories' | 'incomes' | 'expenses' | 'dailyExpenses' | 'activeMonth' | 'closings'>,
): AllocationResult {
  const dailyExpenses = state.dailyExpenses ?? []
  const categories = sortedCategories(state.categories ?? [])
  const dailyByCategory = dailyCentsByCategory(dailyExpenses, state.activeMonth)
  const expenses = state.expenses.map((expense) => ({ ...expense }))
  const claimed = new Set<string>()

  for (const category of categories) {
    const cents = dailyByCategory.get(category.id) ?? 0
    if (cents <= 0) continue
    const match = expenses.find((expense) => expense.categoryId === category.id && !expense.id.startsWith('diarias-'))
    if (match) {
      claimed.add(category.id)
      continue
    }
    expenses.push({
      id: `diarias-${category.id}`,
      name: `${category.name} do dia`,
      detail: 'Lançamentos do mês',
      amount: fromCents(cents),
      priority: category.priority_level,
      categoryId: category.id,
    })
    claimed.add(category.id)
  }

  for (const [categoryId, cents] of dailyByCategory) {
    if (cents <= 0 || claimed.has(categoryId)) continue
    const category = categories.find((item) => item.id === categoryId)
    expenses.push({
      id: `diarias-${categoryId}`,
      name: `${category?.name ?? 'Categoria'} do dia`,
      detail: 'Lançamentos do mês',
      amount: fromCents(cents),
      priority: category?.priority_level ?? 3,
      categoryId,
    })
  }

  const carriedForward = carriedForwardBalance(state.closings, state.activeMonth)
  const carriedCents = toCents(carriedForward)
  const monthIncomeCents = state.incomes.reduce((sum, income) => sum + toCents(income.amount), 0)
  const availableCents = monthIncomeCents + Math.max(0, carriedCents)

  if (carriedCents < 0) {
    const debtCategory =
      categories.find((item) => item.priority_level === 1)?.id ?? categories[0]?.id ?? 'cat-contas'
    expenses.unshift({
      id: CARRYOVER_DEBT_ID,
      name: 'Saldo devedor acumulado',
      detail: 'Déficit do mês anterior registrado',
      amount: fromCents(-carriedCents),
      priority: 1,
      categoryId: debtCategory,
    })
  }

  let balance = availableCents
  let totalDue = 0
  let totalAllocated = 0
  let sombra = 0

  const lines = orderedExpenses(expenses).map((expense, index) => {
    const hasPlannedMatch = !expense.id.startsWith('diarias-')
    const extra =
      hasPlannedMatch && dailyByCategory.has(expense.categoryId)
        ? (() => {
            const first = expenses.find(
              (item) => item.categoryId === expense.categoryId && !item.id.startsWith('diarias-'),
            )
            return first?.id === expense.id ? (dailyByCategory.get(expense.categoryId) ?? 0) : 0
          })()
        : 0
    const due = toCents(expense.amount) + extra
    totalDue += due
    const locked = expense.id.startsWith('diarias-') || expense.id === CARRYOVER_DEBT_ID

    if (due === 0) {
      return {
        expense,
        order: index + 1,
        due: 0,
        dailyAmount: fromCents(extra),
        locked,
        allocated: 0,
        uncovered: 0,
        runningBalance: fromCents(balance),
        status: 'pending' as const,
      }
    }

    const allocated = Math.min(balance, due)
    balance -= allocated
    totalAllocated += allocated
    const uncovered = due - allocated
    sombra += uncovered

    let status: AllocationResult['lines'][number]['status'] = 'uncovered'
    if (allocated === due) status = 'covered'
    else if (allocated > 0) status = 'partial'

    return {
      expense,
      order: index + 1,
      due: fromCents(due),
      dailyAmount: fromCents(extra),
      locked,
      allocated: fromCents(allocated),
      uncovered: fromCents(uncovered),
      runningBalance: fromCents(balance),
      status,
    }
  })

  const sobra = fromCents(balance)
  const knownDue = totalDue
  const coverageRate = knownDue === 0 ? 1 : totalAllocated / knownDue

  return {
    lines,
    monthIncome: fromCents(monthIncomeCents),
    carriedForward,
    totalIncome: fromCents(availableCents),
    totalDue: fromCents(totalDue),
    totalAllocated: fromCents(totalAllocated),
    sobra,
    sombra: fromCents(sombra),
    coverageRate,
  }
}

export function upsertClosing(state: AppState, result: AllocationResult): AppState {
  const closing: MonthClosing = {
    month: state.activeMonth,
    income: result.monthIncome,
    committed: result.totalAllocated,
    sobra: result.sobra,
    sombra: result.sombra,
  }

  const closings = state.closings.filter((item) => item.month !== closing.month).concat(closing)
  closings.sort((a, b) => a.month.localeCompare(b.month))
  return { ...state, closings }
}

export function projectYear(
  activeMonth: string,
  opening: number,
  liveSobra: number,
  closings: MonthClosing[],
): ProjectionPoint[] {
  const year = yearOf(activeMonth)
  let reserveCents = toCents(opening)
  const positiveLive = Math.max(0, toCents(liveSobra))

  return monthsOfYear(year).map((month) => {
    const closing = closings.find((item) => item.month === month)
    const sobraCents = closing ? Math.max(0, toCents(closing.sobra)) : positiveLive
    reserveCents += sobraCents

    return {
      month,
      label: monthLabel(month),
      shortLabel: monthShort(month),
      sobra: fromCents(sobraCents),
      reserve: fromCents(reserveCents),
      kind: closing ? 'registrado' : 'projetado',
    }
  })
}
