import type { AppState, DailyCategory, DailyExpense, ExpenseItem, ExpenseSettlement, IncomeReceipt, IncomeSource } from './types'
import { clampMoney, currentMonthKey, isDateInMonth } from './money'

export const LEVELS = [
  {
    priority: 1 as const,
    title: 'Nível 1',
    name: 'Mínimo existencial / teto',
    description: 'Habitação, comida, deslocamento e contas da casa.',
  },
  {
    priority: 2 as const,
    title: 'Nível 2',
    name: 'Saúde, educação e serviços',
    description: 'Conectividade, proteção, dentistas e curso.',
  },
  {
    priority: 3 as const,
    title: 'Nível 3',
    name: 'Carnês e impostos',
    description: 'Parcelamentos e tributos depois do essencial.',
  },
]

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
  const caixa = asRecord(raw.caixa)
  const expenseIds = new Set(base.expenses.map((expense) => expense.id))
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
    expenses: base.expenses.map((expense) => {
      const saved = expenseRows.map(asRecord).find((row) => row?.id === expense.id)
      return {
        ...expense,
        amount: clampMoney(typeof saved?.amount === 'number' ? saved.amount : expense.amount),
      }
    }),
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
  }
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

const DAILY_CATEGORIES = new Set<DailyCategory>(['alimentacao', 'combustivel', 'outros'])

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
