export function toCents(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round(value * 100)
}

export function fromCents(cents: number): number {
  return cents / 100
}

export function clampMoney(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0
  return fromCents(toCents(value))
}

export function formatBRL(value: number): string {
  return clampMoney(value).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

export function formatNumber(value: number): string {
  return clampMoney(value).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function formatCompactBRL(value: number): string {
  const safe = clampMoney(value)
  if (safe >= 1000) {
    const thousands = safe / 1000
    const digits = safe >= 10000 ? 0 : 1
    return `R$ ${thousands.toLocaleString('pt-BR', { maximumFractionDigits: digits })} mil`
  }
  return formatBRL(safe)
}

export function parseBRL(input: string): number {
  const cleaned = String(input ?? '')
    .trim()
    .replace(/\s/g, '')
    .replace(/^R\$\.?/i, '')
    .replace(/[^\d,.-]/g, '')

  if (!cleaned || cleaned === '-' || cleaned === ',' || cleaned === '.') return 0

  let normalized = cleaned

  if (cleaned.includes(',')) {
    // Formato BR: pontos de milhar e vírgula decimal (ex.: 1.234,56)
    normalized = cleaned.replace(/\./g, '').replace(',', '.')
  } else {
    const dotCount = (cleaned.match(/\./g) || []).length
    if (dotCount > 1) {
      // Vários pontos sem vírgula → milhar (ex.: 1.234.567)
      normalized = cleaned.replace(/\./g, '')
    } else if (dotCount === 1 && /^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
      // Um ponto em padrão de milhar (ex.: 1.500 → 1500)
      normalized = cleaned.replace(/\./g, '')
    }
    // Caso contrário mantém ponto como decimal (ex.: 12.5)
  }

  // Se ainda restar vírgula (caso misto residual), força ponto decimal
  if (normalized.includes(',')) {
    normalized = normalized.replace(/,/g, '.')
  }

  const parsed = Number(normalized)
  return clampMoney(parsed)
}

/** Aceita number ou string pt-BR/US e devolve float monetário seguro. */
export function coerceMoney(value: unknown): number {
  if (typeof value === 'number') return clampMoney(value)
  if (typeof value === 'string') return parseBRL(value)
  return 0
}

const MONTH_LABELS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
] as const

const MONTH_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'] as const

export function currentMonthKey(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

export function isMonthKey(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
}

export function monthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-')
  const index = Number(month) - 1
  return `${MONTH_LABELS[index] ?? month} ${year}`
}

export function monthShort(monthKey: string): string {
  const month = Number(monthKey.split('-')[1])
  return MONTH_SHORT[month - 1] ?? monthKey
}

export function yearOf(monthKey: string): number {
  return Number(monthKey.slice(0, 4))
}

export function monthsOfYear(year: number): string[] {
  return MONTH_SHORT.map((_, index) => `${year}-${String(index + 1).padStart(2, '0')}`)
}

const WEEKDAY_SHORT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'] as const

export function daysInMonth(monthKey: string): number {
  const [year, month] = monthKey.split('-').map(Number)
  return new Date(year, month, 0).getDate()
}

export function isDateInMonth(date: string, monthKey: string): boolean {
  if (!isMonthKey(monthKey) || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !date.startsWith(`${monthKey}-`)) return false
  const day = Number(date.slice(8))
  return day >= 1 && day <= daysInMonth(monthKey)
}

export function monthDates(monthKey: string): string[] {
  return Array.from({ length: daysInMonth(monthKey) }, (_, index) => {
    return `${monthKey}-${String(index + 1).padStart(2, '0')}`
  })
}

export function mondayIndex(isoDate: string): number {
  const [year, month, day] = isoDate.split('-').map(Number)
  return (new Date(year, month - 1, day).getDay() + 6) % 7
}

export function weekdayShort(isoDate: string): string {
  return WEEKDAY_SHORT[mondayIndex(isoDate)] ?? ''
}

export function weekdayHeaders(): readonly string[] {
  return WEEKDAY_SHORT
}

export function dayHeading(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).replace(/^\p{L}/u, (letter) => letter.toUpperCase())
}

export function formatDueDate(isoDate: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null
  const [year, month, day] = isoDate.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('pt-BR')
}
