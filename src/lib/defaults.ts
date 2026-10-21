import type { AppState, DailyCategory, DailyExpense, ExpenseDue, ExpenseItem, ExpenseSettlement, IncomeReceipt, IncomeSource } from './types'
import { clampMoney, currentMonthKey, isDateInMonth } from './money'

export const SPEND_GROUPS = [
  {
    id: 'alimentacao' as const,
    title: 'Alimentação',
    description: 'O que for lançado no dia como alimentação entra neste campo.',
  },
  {
    id: 'combustivel' as const,
    title: 'Combustível',
    description: 'O que for lançado no dia como combustível entra neste campo.',
  },
  {
    id: 'contas' as const,
    title: 'Contas',
    description: 'Contas previstas e o que for lançado no dia como conta.',
  },
  {
    id: 'outros' as const,
    title: 'Outros',
    description: 'O que for lançado no dia como outros entra neste campo.',
  },
]

export type SpendGroup = (typeof SPEND_GROUPS)[number]['id']

export function spendGroup(expenseId: string): SpendGroup {
  if (expenseId === 'alimentacao' || expenseId === 'diarias-alimentacao') return 'alimentacao'
  if (expenseId === 'combustivel' || expenseId === 'diarias-combustivel') return 'combustivel'
  if (expenseId === 'diarias-outros') return 'outros'
  return 'contas'
}

export const DEFAULT_INCOMES: IncomeSource[] = [
  { id: 'renda-1', label: 'Renda líquida 1', holder: 'Esposa', amount: 5100 },
  { id: 'renda-2', label: 'Renda líquida 2', holder: 'Salário Prefeitura', amount: 1500 },
]

const FIXED_INCOME_IDS = new Set(DEFAULT_INCOMES.map((income) => income.id))

export const DEFAULT_EXPENSES: ExpenseItem[] = [
  { id: 'caixa', name: 'Habitação CAIXA', detail: 'Parcela do financiamento', amount: 2000, priority: 1 },
  { id: 'alimentacao', name: 'Alimentação', detail: 'Valor a informar', amount: 0, priority: 1, editable: true },
  { id: 'combustivel', name: 'Combustível', detail: 'Valor a informar', amount: 0, priority: 1, editable: true },
  { id: 'luz', name: 'Luz', detail: 'Energia elétrica', amount: 900, priority: 1 },
  { id: 'agua', name: 'Água', detail: 'Abastecimento', amount: 150, priority: 1 },
  { id: 'internet', name: 'Internet', detail: 'Serviço de conectividade', amount: 114, priority: 2 },
  { id: 'seguranca', name: 'Segurança', detail: 'Monitoramento', amount: 100, priority: 2 },
  {
    id: 'dentistas',
    name: 'Dentistas',
    detail: 'Leidiane/Gilson e Guilherme',
    amount: 0,
    priority: 2,
    editable: true,
  },
  { id: 'microlins', name: 'Curso Microlins', detail: 'Educação', amount: 410, priority: 2 },
  { id: 'gazin', name: 'Gazin', detail: 'Carnê', amount: 300, priority: 3 },
  { id: 'iptu', name: 'IPTU', detail: 'Provisão mensal a informar', amount: 0, priority: 3, editable: true },
]

export function defaultState(date = new Date()): AppState {
  return {
    incomes: DEFAULT_INCOMES.map((item) => ({ ...item })),
    expenses: DEFAULT_EXPENSES.map((item) => ({ ...item })),
    caixa: {
      overdueInstallments: 0,
      oldestDueDate: '',
      oldestAmount: 2000,
    },
    reserveOpening: 0,
    activeMonth: currentMonthKey(date),
    closings: [],
    dailyExpenses: [],
    settlements: [],
    receipts: [],
    expenseDues: [],
    removedExpenseIds: [],
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

export function sanitizeState(input: unknown): AppState {
  const base = defaultState()
  const raw = asRecord(input)
  if (!raw) return base

  const incomeRows = Array.isArray(raw.incomes) ? raw.incomes : []
  const expenseRows = Array.isArray(raw.expenses) ? raw.expenses : []
  const closingRows = Array.isArray(raw.closings) ? raw.closings : []
  const dailyRows = Array.isArray(raw.dailyExpenses) ? raw.dailyExpenses : []
  const settlementRows = Array.isArray(raw.settlements) ? raw.settlements : []
  const receiptRows = Array.isArray(raw.receipts) ? raw.receipts : []
  const dueRows = Array.isArray(raw.expenseDues) ? raw.expenseDues : []
  const caixa = asRecord(raw.caixa)
  const removedExpenseIds = sanitizeRemovedExpenses(raw.removedExpenseIds)
  const expenses = sanitizeExpenses(expenseRows, new Set(removedExpenseIds))
  const expenseIds = new Set(expenses.map((expense) => expense.id))
  const incomes = [
    ...base.incomes.map((income) => {
      const saved = incomeRows.map(asRecord).find((row) => row?.id === income.id)
      return {
        ...income,
        holder: typeof saved?.holder === 'string' && saved.holder.trim() ? saved.holder : income.holder,
        amount: clampMoney(typeof saved?.amount === 'number' ? saved.amount : income.amount),
      }
    }),
    ...sanitizeExtraIncomes(incomeRows),
  ]

  return {
    incomes,
    expenses,
    caixa: {
      overdueInstallments: Math.max(
        0,
        Math.floor(typeof caixa?.overdueInstallments === 'number' ? caixa.overdueInstallments : 0),
      ),
      oldestDueDate: typeof caixa?.oldestDueDate === 'string' ? caixa.oldestDueDate : '',
      oldestAmount: clampMoney(typeof caixa?.oldestAmount === 'number' ? caixa.oldestAmount : 2000),
    },
    reserveOpening: clampMoney(typeof raw.reserveOpening === 'number' ? raw.reserveOpening : 0),
    activeMonth:
      typeof raw.activeMonth === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(raw.activeMonth)
        ? raw.activeMonth
        : base.activeMonth,
    dailyExpenses: dailyRows
      .map((row) => sanitizeDaily(row))
      .filter((item): item is DailyExpense => item !== null)
      .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)),
    closings: closingRows
      .map((row) => {
        const item = asRecord(row)
        if (!item || typeof item.month !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(item.month)) {
          return null
        }
        return {
          month: item.month,
          income: clampMoney(typeof item.income === 'number' ? item.income : 0),
          committed: clampMoney(typeof item.committed === 'number' ? item.committed : 0),
          sobra: clampMoney(typeof item.sobra === 'number' ? item.sobra : 0),
          sombra: clampMoney(typeof item.sombra === 'number' ? item.sombra : 0),
        }
      })
      .filter((item): item is AppState['closings'][number] => item !== null)
      .sort((a, b) => a.month.localeCompare(b.month)),
    settlements: sanitizeSettlements(settlementRows, expenseIds),
    receipts: sanitizeReceipts(
      receiptRows,
      new Set(incomes.map((income) => income.id)),
    ),
    expenseDues: sanitizeExpenseDues(dueRows, expenseIds),
    removedExpenseIds,
  }
}

const DEFAULT_EXPENSE_IDS = new Set(DEFAULT_EXPENSES.map((expense) => expense.id))

function sanitizeRemovedExpenses(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter((id): id is string => typeof id === 'string' && DEFAULT_EXPENSE_IDS.has(id)))]
}

function readPriority(value: unknown, fallback: ExpenseItem['priority']): ExpenseItem['priority'] {
  return value === 1 || value === 2 || value === 3 ? value : fallback
}

function readName(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback
  const name = value.trim().slice(0, 80)
  return name || fallback
}

function sanitizeExpenses(rows: unknown[], removed: Set<string>): ExpenseItem[] {
  const saved = rows.map(asRecord)
  const defaults = DEFAULT_EXPENSES.filter((expense) => !removed.has(expense.id)).map((expense) => {
    const row = saved.find((item) => item?.id === expense.id)
    return {
      ...expense,
      name: readName(row?.name, expense.name),
      amount: clampMoney(typeof row?.amount === 'number' ? row.amount : expense.amount),
      priority: readPriority(row?.priority, expense.priority),
    }
  })

  return [...defaults, ...sanitizeExtraExpenses(saved)]
}

function sanitizeExtraExpenses(rows: Array<Record<string, unknown> | null>): ExpenseItem[] {
  const seen = new Set<string>()
  const extras: ExpenseItem[] = []

  for (const row of rows) {
    if (!row || row.custom !== true || typeof row.id !== 'string' || !row.id || DEFAULT_EXPENSE_IDS.has(row.id) || seen.has(row.id)) {
      continue
    }
    const name = typeof row.name === 'string' ? row.name.trim().slice(0, 80) : ''
    const amount = clampMoney(typeof row.amount === 'number' ? row.amount : 0)
    if (!name && amount <= 0) continue
    seen.add(row.id)
    extras.push({
      id: row.id,
      name: name || 'Conta',
      detail: typeof row.detail === 'string' ? row.detail.trim().slice(0, 80) : '',
      amount,
      priority: readPriority(row.priority, 3),
      custom: true,
      editable: true,
    })
  }

  return extras
}

function sanitizeReceipts(rows: unknown[], incomeIds: Set<string>): IncomeReceipt[] {
  const byKey = new Map<string, IncomeReceipt>()

  for (const value of rows) {
    const row = asRecord(value)
    if (!row || typeof row.month !== 'string' || typeof row.incomeId !== 'string' || typeof row.date !== 'string') continue
    if (!incomeIds.has(row.incomeId) || !isDateInMonth(row.date, row.month)) continue
    byKey.set(`${row.month}:${row.incomeId}`, { month: row.month, incomeId: row.incomeId, date: row.date })
  }

  return [...byKey.values()].sort((a, b) => a.month.localeCompare(b.month) || a.date.localeCompare(b.date))
}

function sanitizeExpenseDues(rows: unknown[], expenseIds: Set<string>): ExpenseDue[] {
  const byKey = new Map<string, ExpenseDue>()

  for (const value of rows) {
    const row = asRecord(value)
    if (!row || typeof row.month !== 'string' || typeof row.expenseId !== 'string' || typeof row.date !== 'string') continue
    if (!expenseIds.has(row.expenseId) || !isDateInMonth(row.date, row.month)) continue
    byKey.set(`${row.month}:${row.expenseId}`, { month: row.month, expenseId: row.expenseId, date: row.date })
  }

  return [...byKey.values()].sort((a, b) => a.month.localeCompare(b.month) || a.date.localeCompare(b.date))
}

function sanitizeSettlements(rows: unknown[], expenseIds: Set<string>): ExpenseSettlement[] {
  const byKey = new Map<string, ExpenseSettlement>()

  for (const value of rows) {
    const row = asRecord(value)
    if (!row || typeof row.month !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(row.month)) continue
    if (typeof row.expenseId !== 'string' || !expenseIds.has(row.expenseId)) continue
    const installments = Math.min(
      480,
      Math.max(0, Math.floor(typeof row.installments === 'number' ? row.installments : 0)),
    )
    const paid = row.paid === true
    if (!paid && installments <= 0) continue
    byKey.set(`${row.month}:${row.expenseId}`, {
      month: row.month,
      expenseId: row.expenseId,
      paid,
      installments,
    })
  }

  return [...byKey.values()].sort((a, b) => a.month.localeCompare(b.month) || a.expenseId.localeCompare(b.expenseId))
}

function sanitizeExtraIncomes(rows: unknown[]): IncomeSource[] {
  const seen = new Set<string>()
  const extras: IncomeSource[] = []

  for (const value of rows) {
    const row = asRecord(value)
    if (!row || typeof row.id !== 'string' || !row.id || FIXED_INCOME_IDS.has(row.id) || seen.has(row.id)) continue
    const holder = typeof row.holder === 'string' ? row.holder.trim().slice(0, 80) : ''
    const amount = clampMoney(typeof row.amount === 'number' ? row.amount : 0)
    if (!holder && amount <= 0) continue
    seen.add(row.id)
    extras.push({
      id: row.id,
      label: 'Outra entrada',
      holder,
      amount,
      custom: true,
    })
  }

  return extras
}

const DAILY_CATEGORIES = new Set<DailyCategory>(['alimentacao', 'combustivel', 'contas', 'outros'])

function sanitizeDaily(value: unknown): DailyExpense | null {
  const row = asRecord(value)
  if (!row || typeof row.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) return null
  if (typeof row.category !== 'string' || !DAILY_CATEGORIES.has(row.category as DailyCategory)) return null
  const description = typeof row.description === 'string' ? row.description.trim() : ''
  if (!description) return null
  const [year, month, day] = row.date.split('-').map(Number)
  const parsed = new Date(year, month - 1, day)
  if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) return null

  const amount = clampMoney(typeof row.amount === 'number' ? row.amount : 0)
  if (amount <= 0) return null

  return {
    id: typeof row.id === 'string' && row.id ? row.id : crypto.randomUUID(),
    date: row.date,
    description,
    amount,
    category: row.category as DailyCategory,
  }
}
