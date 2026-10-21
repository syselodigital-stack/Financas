export type Priority = 1 | 2 | 3

export interface IncomeSource {
  id: string
  label: string
  holder: string
  amount: number
  custom?: boolean
}

export interface ExpenseItem {
  id: string
  name: string
  detail: string
  amount: number
  priority: Priority
  editable?: boolean
  custom?: boolean
}

export type DailyCategory = 'alimentacao' | 'combustivel' | 'outros'

export interface DailyExpense {
  id: string
  date: string
  description: string
  amount: number
  category: DailyCategory
}

export interface CaixaContract {
  overdueInstallments: number
  oldestDueDate: string
  oldestAmount: number
}

export interface MonthClosing {
  month: string
  income: number
  committed: number
  sobra: number
  sombra: number
}

export interface ExpenseSettlement {
  month: string
  expenseId: string
  paid: boolean
  installments: number
}

export interface IncomeReceipt {
  month: string
  incomeId: string
  date: string
}

export interface ExpenseDue {
  month: string
  expenseId: string
  date: string
}

export interface AppState {
  incomes: IncomeSource[]
  expenses: ExpenseItem[]
  dailyExpenses: DailyExpense[]
  caixa: CaixaContract
  reserveOpening: number
  activeMonth: string
  closings: MonthClosing[]
  settlements: ExpenseSettlement[]
  receipts: IncomeReceipt[]
  expenseDues: ExpenseDue[]
  removedExpenseIds: string[]
}

export type CoverageStatus = 'pending' | 'covered' | 'partial' | 'uncovered'

export interface AllocationLine {
  expense: ExpenseItem
  order: number
  due: number
  dailyAmount: number
  locked: boolean
  allocated: number
  uncovered: number
  runningBalance: number
  status: CoverageStatus
}

export interface AllocationResult {
  lines: AllocationLine[]
  totalIncome: number
  totalDue: number
  totalAllocated: number
  sobra: number
  sombra: number
  coverageRate: number
}

export interface ProjectionPoint {
  month: string
  label: string
  shortLabel: string
  sobra: number
  reserve: number
  kind: 'registrado' | 'projetado'
}

export interface SupabaseConfig {
  url: string
  anonKey: string
}
