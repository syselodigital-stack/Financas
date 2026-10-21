import type { AllocationResult, AppState, DailyExpense, ExpenseItem, MonthClosing, ProjectionPoint } from './types'
import { fromCents, monthsOfYear, monthLabel, monthShort, toCents, yearOf } from './money'

function dailyCents(entries: DailyExpense[], month: string, category: DailyExpense['category']): number {
  return entries
    .filter((entry) => entry.date.startsWith(month) && entry.category === category)
    .reduce((sum, entry) => sum + toCents(entry.amount), 0)
}

function orderedExpenses(expenses: ExpenseItem[]): ExpenseItem[] {
  return expenses
    .map((expense, index) => ({ expense, index }))
    .sort((a, b) => a.expense.priority - b.expense.priority || a.index - b.index)
    .map((item) => item.expense)
}

export function allocate(
  state: Pick<AppState, 'incomes' | 'expenses' | 'dailyExpenses' | 'activeMonth'>,
): AllocationResult {
  const dailyExpenses = state.dailyExpenses ?? []
  const foodDaily = dailyCents(dailyExpenses, state.activeMonth, 'alimentacao')
  const fuelDaily = dailyCents(dailyExpenses, state.activeMonth, 'combustivel')
  const billDaily = dailyCents(dailyExpenses, state.activeMonth, 'contas')
  const otherDaily = dailyCents(dailyExpenses, state.activeMonth, 'outros')
  const expenses = state.expenses.map((expense) => ({ ...expense }))
  if (foodDaily > 0 && !expenses.some((expense) => expense.id === 'alimentacao')) {
    expenses.push({
      id: 'diarias-alimentacao',
      name: 'Alimentação do dia',
      detail: 'Lançamentos do mês',
      amount: fromCents(foodDaily),
      priority: 1,
    })
  }
  if (fuelDaily > 0 && !expenses.some((expense) => expense.id === 'combustivel')) {
    expenses.push({
      id: 'diarias-combustivel',
      name: 'Combustível do dia',
      detail: 'Lançamentos do mês',
      amount: fromCents(fuelDaily),
      priority: 1,
    })
  }
  if (otherDaily > 0) {
    const waterIndex = expenses.findIndex((expense) => expense.id === 'agua')
    expenses.splice(waterIndex === -1 ? expenses.length : waterIndex + 1, 0, {
      id: 'diarias-outros',
      name: 'Outros do dia',
      detail: 'Lançamentos avulsos do mês',
      amount: fromCents(otherDaily),
      priority: 1,
    })
  }
  if (billDaily > 0) {
    expenses.push({
      id: 'diarias-contas',
      name: 'Contas do dia',
      detail: 'Lançamentos do mês',
      amount: fromCents(billDaily),
      priority: 3,
    })
  }

  const totalIncomeCents = state.incomes.reduce((sum, income) => sum + toCents(income.amount), 0)
  let balance = totalIncomeCents
  let totalDue = 0
  let totalAllocated = 0
  let sombra = 0

  const lines = orderedExpenses(expenses).map((expense, index) => {
    const extra = expense.id === 'alimentacao' ? foodDaily : expense.id === 'combustivel' ? fuelDaily : 0
    const due = toCents(expense.amount) + extra
    totalDue += due
    const locked = expense.id.startsWith('diarias-')

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
    totalIncome: fromCents(totalIncomeCents),
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
    income: result.totalIncome,
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

export const MORA_THRESHOLD = 3

export function hasHousingDelinquency(overdueInstallments: number): boolean {
  return overdueInstallments >= MORA_THRESHOLD
}
