import type {
  AppState,
  DailyExpense,
  ExpenseCategory,
  ExpenseDue,
  ExpenseItem,
  ExpenseSettlement,
  IncomeReceipt,
  IncomeSource,
  Priority,
} from './types'
import { coerceMoney, currentMonthKey, isDateInMonth } from './money'

export const DEFAULT_CATEGORIES: ExpenseCategory[] = [
  { id: 'cat-alimentacao', name: 'Alimentação', priority_level: 1 },
  { id: 'cat-combustivel', name: 'Combustível', priority_level: 1 },
  { id: 'cat-contas', name: 'Contas', priority_level: 2 },
]

const LEGACY_CATEGORY_MAP: Record<string, string> = {
  alimentacao: 'cat-alimentacao',
  combustivel: 'cat-combustivel',
  contas: 'cat-contas',
  outros: 'cat-contas',
}

export const CATEGORY_COLORS = [
  '#0f766e',
  '#1e4d6b',
  '#9a5b2f',
  '#7c3aed',
  '#be185d',
  '#047857',
  '#b45309',
  '#0369a1',
]

export function categoryColor(index: number): string {
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length] ?? '#0f766e'
}

export function sortedCategories(categories: ExpenseCategory[]): ExpenseCategory[] {
  return [...categories].sort(
    (a, b) => a.priority_level - b.priority_level || a.name.localeCompare(b.name, 'pt-BR') || a.id.localeCompare(b.id),
  )
}

export function resolveCategoryId(
  categories: ExpenseCategory[],
  categoryId?: string,
  fallback = DEFAULT_CATEGORIES[2]?.id ?? 'cat-contas',
): string {
  if (categoryId && categories.some((item) => item.id === categoryId)) return categoryId
  return categories[0]?.id ?? fallback
}

export const DEFAULT_INCOMES: IncomeSource[] = [
  { id: 'renda-1', label: 'Renda líquida 1', holder: 'Esposa', amount: 5100 },
  { id: 'renda-2', label: 'Renda líquida 2', holder: 'Salário Prefeitura', amount: 1500 },
]

const FIXED_INCOME_IDS = new Set(DEFAULT_INCOMES.map((income) => income.id))

export const DEFAULT_EXPENSES: ExpenseItem[] = [
  { id: 'caixa', name: 'Habitação CAIXA', detail: 'Parcela do financiamento', amount: 2000, priority: 1, categoryId: 'cat-contas' },
  { id: 'alimentacao', name: 'Alimentação', detail: 'Valor a informar', amount: 0, priority: 1, categoryId: 'cat-alimentacao', editable: true },
  { id: 'combustivel', name: 'Combustível', detail: 'Valor a informar', amount: 0, priority: 1, categoryId: 'cat-combustivel', editable: true },
  { id: 'luz', name: 'Luz', detail: 'Energia elétrica', amount: 900, priority: 1, categoryId: 'cat-contas' },
  { id: 'agua', name: 'Água', detail: 'Abastecimento', amount: 150, priority: 1, categoryId: 'cat-contas' },
  { id: 'internet', name: 'Internet', detail: 'Serviço de conectividade', amount: 114, priority: 2, categoryId: 'cat-contas' },
  { id: 'seguranca', name: 'Segurança', detail: 'Monitoramento', amount: 100, priority: 2, categoryId: 'cat-contas' },
  {
    id: 'dentistas',
    name: 'Dentistas',
    detail: 'Leidiane/Gilson e Guilherme',
    amount: 0,
    priority: 2,
    categoryId: 'cat-contas',
    editable: true,
  },
  { id: 'microlins', name: 'Curso Microlins', detail: 'Educação', amount: 410, priority: 2, categoryId: 'cat-contas' },
  { id: 'gazin', name: 'Gazin', detail: 'Carnê', amount: 300, priority: 3, categoryId: 'cat-contas' },
  { id: 'iptu', name: 'IPTU', detail: 'Provisão mensal a informar', amount: 0, priority: 3, categoryId: 'cat-contas', editable: true },
]

export function defaultState(date = new Date()): AppState {
  return {
    categories: DEFAULT_CATEGORIES.map((item) => ({ ...item })),
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

export function isPristineState(state: AppState): boolean {
  if (
    state.dailyExpenses.length > 0 ||
    state.closings.length > 0 ||
    state.settlements.length > 0 ||
    state.receipts.length > 0 ||
    state.expenseDues.length > 0 ||
    state.removedExpenseIds.length > 0 ||
    state.reserveOpening !== 0
  ) {
    return false
  }
  if (state.caixa.overdueInstallments !== 0 || state.caixa.oldestDueDate !== '' || state.caixa.oldestAmount !== 2000) {
    return false
  }
  if (
    state.categories.length !== DEFAULT_CATEGORIES.length ||
    state.incomes.length !== DEFAULT_INCOMES.length ||
    state.expenses.length !== DEFAULT_EXPENSES.length
  ) {
    return false
  }
  const categoriesMatch = DEFAULT_CATEGORIES.every((category) => {
    const current = state.categories.find((item) => item.id === category.id)
    return current?.name === category.name && current.priority_level === category.priority_level
  })
  const incomesMatch = DEFAULT_INCOMES.every((income) => {
    const current = state.incomes.find((item) => item.id === income.id)
    return current?.amount === income.amount && current.holder === income.holder && !current.custom
  })
  const expensesMatch = DEFAULT_EXPENSES.every((expense) => {
    const current = state.expenses.find((item) => item.id === expense.id)
    return (
      current?.amount === expense.amount &&
      current.name === expense.name &&
      current.categoryId === expense.categoryId &&
      !current.custom
    )
  })
  return categoriesMatch && incomesMatch && expensesMatch
}

export function sameState(left: AppState, right: AppState): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

export function keepDrafts(local: AppState, remote: AppState): AppState {
  const incomeIds = new Set(remote.incomes.map((income) => income.id))
  const expenseIds = new Set(remote.expenses.map((expense) => expense.id))
  const incomeDrafts = local.incomes.filter(
    (income) => income.custom && !incomeIds.has(income.id) && !income.holder.trim() && income.amount <= 0,
  )
  const expenseDrafts = local.expenses.filter(
    (expense) => expense.custom && !expenseIds.has(expense.id) && !expense.name.trim() && expense.amount <= 0,
  )
  if (incomeDrafts.length === 0 && expenseDrafts.length === 0) return remote

  const draftIds = new Set(incomeDrafts.map((income) => income.id))
  const receiptDrafts = local.receipts.filter(
    (receipt) =>
      draftIds.has(receipt.incomeId) &&
      !remote.receipts.some((item) => item.month === receipt.month && item.incomeId === receipt.incomeId),
  )

  return {
    ...remote,
    incomes: [...remote.incomes, ...incomeDrafts],
    expenses: [...remote.expenses, ...expenseDrafts],
    receipts: [...remote.receipts, ...receiptDrafts],
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

  const categories = sanitizeCategories(raw.categories)
  const categoryIds = new Set(categories.map((item) => item.id))
  const incomeRows = Array.isArray(raw.incomes) ? raw.incomes : []
  const expenseRows = Array.isArray(raw.expenses) ? raw.expenses : []
  const closingRows = Array.isArray(raw.closings) ? raw.closings : []
  const dailyRows = Array.isArray(raw.dailyExpenses) ? raw.dailyExpenses : []
  const settlementRows = Array.isArray(raw.settlements) ? raw.settlements : []
  const receiptRows = Array.isArray(raw.receipts) ? raw.receipts : []
  const dueRows = Array.isArray(raw.expenseDues) ? raw.expenseDues : []
  const caixa = asRecord(raw.caixa)
  const removedExpenseIds = sanitizeRemovedExpenses(raw.removedExpenseIds)
  const expenses = sanitizeExpenses(expenseRows, new Set(removedExpenseIds), categoryIds)
  const expenseIds = new Set(expenses.map((expense) => expense.id))
  const incomes = [
    ...base.incomes.map((income) => {
      const saved = incomeRows.map(asRecord).find((row) => row?.id === income.id)
      return {
        ...income,
        holder: typeof saved?.holder === 'string' && saved.holder.trim() ? saved.holder : income.holder,
        amount: coerceMoney(saved?.amount ?? income.amount),
      }
    }),
    ...sanitizeExtraIncomes(incomeRows),
  ]

  return {
    categories,
    incomes,
    expenses,
    caixa: {
      overdueInstallments: Math.max(
        0,
        Math.floor(typeof caixa?.overdueInstallments === 'number' ? caixa.overdueInstallments : 0),
      ),
      oldestDueDate: typeof caixa?.oldestDueDate === 'string' ? caixa.oldestDueDate : '',
      oldestAmount: coerceMoney(caixa?.oldestAmount ?? 2000),
    },
    reserveOpening: coerceMoney(raw.reserveOpening ?? 0),
    activeMonth:
      typeof raw.activeMonth === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(raw.activeMonth)
        ? raw.activeMonth
        : base.activeMonth,
    dailyExpenses: dailyRows
      .map((row) => sanitizeDaily(row, categoryIds))
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
          income: coerceMoney(item.income),
          committed: coerceMoney(item.committed),
          sobra: coerceMoney(item.sobra),
          sombra: coerceMoney(item.sombra),
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

function readPriority(value: unknown, fallback: Priority): Priority {
  return value === 1 || value === 2 || value === 3 ? value : fallback
}

function readName(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback
  const name = value.trim().slice(0, 80)
  return name || fallback
}

export function sanitizeCategories(value: unknown): ExpenseCategory[] {
  if (!Array.isArray(value) || value.length === 0) {
    return DEFAULT_CATEGORIES.map((item) => ({ ...item }))
  }

  const seen = new Set<string>()
  const categories: ExpenseCategory[] = []
  for (const item of value) {
    const row = asRecord(item)
    if (!row || typeof row.id !== 'string' || !row.id || seen.has(row.id)) continue
    const name = typeof row.name === 'string' ? row.name.trim().slice(0, 80) : ''
    if (!name) continue
    if (/^outros$/i.test(name)) continue
    const priority =
      typeof row.priority_level === 'number'
        ? readPriority(row.priority_level, 2)
        : readPriority(row.priority, 2)
    seen.add(row.id)
    categories.push({ id: row.id, name, priority_level: priority })
  }

  return categories.length > 0 ? sortedCategories(categories) : DEFAULT_CATEGORIES.map((item) => ({ ...item }))
}

function pickCategoryId(value: unknown, categoryIds: Set<string>, fallback: string): string {
  if (typeof value === 'string' && categoryIds.has(value)) return value
  if (categoryIds.has(fallback)) return fallback
  return [...categoryIds][0] ?? fallback
}

function sanitizeExpenses(rows: unknown[], removed: Set<string>, categoryIds: Set<string>): ExpenseItem[] {
  const saved = rows.map(asRecord)
  const defaults = DEFAULT_EXPENSES.filter((expense) => !removed.has(expense.id)).map((expense) => {
    const row = saved.find((item) => item?.id === expense.id)
    return {
      ...expense,
      name: readName(row?.name, expense.name),
      amount: coerceMoney(row?.amount ?? expense.amount),
      priority: readPriority(row?.priority, expense.priority),
      categoryId: pickCategoryId(row?.categoryId, categoryIds, expense.categoryId),
    }
  })

  return [...defaults, ...sanitizeExtraExpenses(saved, categoryIds)]
}

function sanitizeExtraExpenses(rows: Array<Record<string, unknown> | null>, categoryIds: Set<string>): ExpenseItem[] {
  const seen = new Set<string>()
  const extras: ExpenseItem[] = []
  const fallback = [...categoryIds][0] ?? 'cat-contas'

  for (const row of rows) {
    if (!row || row.custom !== true || typeof row.id !== 'string' || !row.id || DEFAULT_EXPENSE_IDS.has(row.id) || seen.has(row.id)) {
      continue
    }
    const name = typeof row.name === 'string' ? row.name.trim().slice(0, 80) : ''
    const amount = coerceMoney(row.amount)
    if (!name && amount <= 0) continue
    const categoryId =
      typeof row.categoryId === 'string' && categoryIds.has(row.categoryId) ? row.categoryId : fallback
    seen.add(row.id)
    extras.push({
      id: row.id,
      name: name || 'Conta',
      detail: typeof row.detail === 'string' ? row.detail.trim().slice(0, 80) : '',
      amount,
      priority: readPriority(row.priority, 3),
      categoryId,
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
    const amount = coerceMoney(row.amount)
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

function resolveLegacyCategoryId(value: string, categoryIds: Set<string>): string {
  if (value && categoryIds.has(value)) return value
  const mapped = value ? LEGACY_CATEGORY_MAP[value] : undefined
  if (mapped && categoryIds.has(mapped)) return mapped
  if (categoryIds.has('cat-contas')) return 'cat-contas'
  return [...categoryIds][0] ?? 'cat-contas'
}

function sanitizeDaily(value: unknown, categoryIds: Set<string>): DailyExpense | null {
  const row = asRecord(value)
  if (!row || typeof row.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) return null
  const rawCategory =
    typeof row.categoryId === 'string'
      ? row.categoryId
      : typeof row.category === 'string'
        ? row.category
        : ''
  const categoryId = resolveLegacyCategoryId(rawCategory, categoryIds)
  const description = typeof row.description === 'string' ? row.description.trim() : ''
  if (!description) return null
  const [year, month, day] = row.date.split('-').map(Number)
  const parsed = new Date(year, month - 1, day)
  if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) return null

  const amount = coerceMoney(row.amount)
  if (amount <= 0) return null

  return {
    id: typeof row.id === 'string' && row.id ? row.id : crypto.randomUUID(),
    date: row.date,
    description,
    amount,
    categoryId,
  }
}
