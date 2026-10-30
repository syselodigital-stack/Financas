import { useEffect, useMemo, useState } from 'react'
import { CurrencyField } from './CurrencyField'
import { CategoryPicker } from './CategoryPicker'
import { coerceMoney, dayHeading, formatBRL, mondayIndex, monthDates, weekdayHeaders } from '../lib/money'
import { resolveCategoryId, sortedCategories } from '../lib/defaults'
import type { DailyExpense, ExpenseCategory, Priority } from '../lib/types'

interface CalendarItem {
  id: string
  name: string
  amount: number
  date: string
}

interface DailyLedgerProps {
  month: string
  entries: DailyExpense[]
  categories: ExpenseCategory[]
  incomes: CalendarItem[]
  bills: CalendarItem[]
  unplaced: string[]
  onAdd: (entry: Omit<DailyExpense, 'id'>) => void
  onRemove: (id: string) => void
  onCreateCategory: (input: { name: string; priority_level: Priority }) => ExpenseCategory | null
}

export function DailyLedger({
  month,
  entries,
  categories,
  incomes,
  bills,
  unplaced,
  onAdd,
  onRemove,
  onCreateCategory,
}: DailyLedgerProps) {
  const dates = useMemo(() => monthDates(month), [month])
  const ordered = sortedCategories(categories)
  const [selected, setSelected] = useState(() => preferredDay(month))
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState(0)
  const [categoryId, setCategoryId] = useState(() => resolveCategoryId(categories))

  useEffect(() => {
    setSelected(preferredDay(month))
  }, [month])

  useEffect(() => {
    setCategoryId((current) => resolveCategoryId(categories, current))
  }, [categories])

  const monthEntries = entries.filter((entry) => entry.date.startsWith(month))
  const selectedEntries = monthEntries.filter((entry) => entry.date === selected)
  const total = sum(monthEntries)
  const filledDays = new Set(monthEntries.map((entry) => entry.date)).size
  const leading = mondayIndex(dates[0] ?? `${month}-01`)
  const selectedIndex = dates.indexOf(selected)
  const days = useMemo(() => projectMonth(dates, incomes, bills, monthEntries), [dates, incomes, bills, monthEntries])
  const selectedDay = days.find((day) => day.date === selected) ?? days[0]
  const closing = days[days.length - 1]?.balance ?? 0

  function addEntry() {
    const text = description.trim()
    const value = coerceMoney(amount)
    if (!text || value <= 0 || !categoryId) return
    onAdd({ date: selected, description: text, amount: value, categoryId })
    setDescription('')
    setAmount(0)
  }

  function moveDay(step: number) {
    const next = dates[selectedIndex + step]
    if (next) setSelected(next)
  }

  return (
    <section id="diario" className="rounded-3xl bg-card p-5 ring-1 ring-line md:p-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h2 className="font-serif text-2xl">Calendário do mês</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted">
            Cada dia mostra a entrada, a conta e o gasto lançado. Escolha a categoria cadastrada ou inclua uma nova.
          </p>
        </div>
        <p className="text-right">
          <span className="block text-xs font-bold tracking-wide text-muted uppercase">Saldo no fim do mês</span>
          <span className={`font-serif text-3xl ${closing < 0 ? 'text-alert' : ''}`}>{formatSigned(closing)}</span>
        </p>
      </div>

      <ul className="mt-4 flex flex-wrap gap-2 text-sm">
        {ordered.map((category) => {
          const value = sum(monthEntries.filter((entry) => entry.categoryId === category.id))
          return (
            <li key={category.id} className="rounded-full bg-foam px-3 py-1">
              {category.name} {formatBRL(value)}
            </li>
          )
        })}
        <li className="rounded-full bg-[#efe6d6] px-3 py-1">
          {filledDays} de {dates.length} dias com lançamento
        </li>
        <li className="rounded-full bg-paper px-3 py-1">Gastos do dia {formatBRL(total)}</li>
      </ul>
      {unplaced.length > 0 && (
        <p className="mt-3 text-sm text-muted">Ainda sem dia no calendário: {unplaced.join(', ')}.</p>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold tracking-wide text-muted uppercase">
            {weekdayHeaders().map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {Array.from({ length: leading }, (_, index) => (
              <span key={`blank-${index}`} />
            ))}
            {dates.map((date) => {
              const day = days.find((item) => item.date === date)
              const active = date === selected
              const marks = [
                day && day.incomes.length > 0 ? 'entrada' : '',
                day && day.bills.length > 0 ? 'conta' : '',
                day && day.dailyTotal > 0 ? 'gasto' : '',
              ].filter(Boolean)
              return (
                <button
                  key={date}
                  type="button"
                  aria-pressed={active}
                  aria-label={`${dayHeading(date)}${marks.length > 0 ? `, ${marks.join(', ')}` : ''}`}
                  onClick={() => setSelected(date)}
                  className={`min-h-16 rounded-2xl px-1 py-1.5 text-left ${
                    active ? 'bg-teal text-white' : 'bg-paper text-ink'
                  }`}
                >
                  <span className="block text-xs font-semibold">{Number(date.slice(-2))}</span>
                  <span className="mt-1 flex gap-1" aria-hidden="true">
                    {day && day.incomes.length > 0 && (
                      <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-[#e8c27a]' : 'bg-gold'}`} />
                    )}
                    {day && day.bills.length > 0 && (
                      <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-white' : 'bg-alert'}`} />
                    )}
                    {day && day.dailyTotal > 0 && (
                      <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-foam' : 'bg-teal'}`} />
                    )}
                  </span>
                </button>
              )
            })}
          </div>
          <ul className="mt-3 flex flex-wrap gap-3 text-xs text-muted">
            <li className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-gold" /> Entrada</li>
            <li className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-alert" /> Conta</li>
            <li className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-teal" /> Gasto do dia</li>
          </ul>
        </div>

        <div className="rounded-3xl bg-paper/80 p-4">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              className="rounded-full px-3 py-1.5 text-sm font-semibold text-teal disabled:text-muted"
              disabled={selectedIndex <= 0}
              onClick={() => moveDay(-1)}
            >
              Dia anterior
            </button>
            <button
              type="button"
              className="rounded-full px-3 py-1.5 text-sm font-semibold text-teal disabled:text-muted"
              disabled={selectedIndex === dates.length - 1}
              onClick={() => moveDay(1)}
            >
              Próximo dia
            </button>
          </div>
          <h3 className="mt-3 font-serif text-2xl">{dayHeading(selected)}</h3>
          <p className={`mt-1 text-sm font-semibold ${selectedDay && selectedDay.balance < 0 ? 'text-alert' : 'text-ink'}`}>
            Saldo até este dia: {formatSigned(selectedDay?.balance ?? 0)}
          </p>

          <DayList title="Entradas" items={selectedDay?.incomes ?? []} empty="Nenhuma entrada neste dia." />
          <DayList title="Contas" items={selectedDay?.bills ?? []} empty="Nenhuma conta neste dia." />

          <form
            className="mt-4 space-y-3"
            onSubmit={(event) => {
              event.preventDefault()
              addEntry()
            }}
          >
            <label className="block">
              <span className="mb-1 block text-xs font-semibold tracking-wide text-muted uppercase">Descrição</span>
              <input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Mercado, gasolina, luz, farmácia..."
                className="w-full rounded-2xl bg-white px-3 py-2.5 ring-1 ring-line outline-none focus:ring-2 focus:ring-teal"
              />
            </label>
            <div>
              <span className="mb-1 block text-xs font-semibold tracking-wide text-muted uppercase">Categoria</span>
              <CategoryPicker
                categories={categories}
                value={categoryId}
                onChange={setCategoryId}
                onCreate={onCreateCategory}
              />
            </div>
            <CurrencyField id="daily-amount" label="Valor do lançamento" value={amount} onChange={setAmount} />
            <button
              type="submit"
              disabled={!description.trim() || amount <= 0 || !categoryId}
              className="w-full rounded-full bg-teal px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              Lançar neste dia
            </button>
          </form>

          <ul className="mt-4 space-y-2">
            {selectedEntries.length === 0 && (
              <li className="text-sm text-muted">Nenhum lançamento neste dia.</li>
            )}
            {selectedEntries.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-2">
                <span>
                  <span className="block font-semibold">{entry.description}</span>
                  <span className="text-xs text-muted">
                    {ordered.find((item) => item.id === entry.categoryId)?.name ?? 'Categoria'}
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="font-semibold tabular-nums">{formatBRL(entry.amount)}</span>
                  <button
                    type="button"
                    className="text-sm font-semibold text-alert"
                    onClick={() => onRemove(entry.id)}
                  >
                    Excluir
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

export function preferredDay(month: string): string {
  const today = new Date()
  const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  if (key === month) return `${month}-${String(today.getDate()).padStart(2, '0')}`
  return `${month}-01`
}

function formatSigned(value: number): string {
  const amount = Number.isFinite(value) ? value : 0
  return amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function sum(entries: DailyExpense[]): number {
  return entries.reduce((total, entry) => total + entry.amount, 0)
}

interface DaySnapshot {
  date: string
  incomes: CalendarItem[]
  bills: CalendarItem[]
  dailyTotal: number
  balance: number
}

function projectMonth(
  dates: string[],
  incomes: CalendarItem[],
  bills: CalendarItem[],
  entries: DailyExpense[],
): DaySnapshot[] {
  let balance = 0
  return dates.map((date) => {
    const dayIncomes = incomes.filter((item) => item.date === date && item.amount > 0)
    const dayBills = bills.filter((item) => item.date === date && item.amount > 0)
    const dailyTotal = sum(entries.filter((entry) => entry.date === date))
    balance +=
      dayIncomes.reduce((total, item) => total + item.amount, 0) -
      dayBills.reduce((total, item) => total + item.amount, 0) -
      dailyTotal
    return { date, incomes: dayIncomes, bills: dayBills, dailyTotal, balance }
  })
}

function DayList({ title, items, empty }: { title: string; items: CalendarItem[]; empty: string }) {
  return (
    <div className="mt-4">
      <p className="text-xs font-semibold tracking-wide text-muted uppercase">{title}</p>
      {items.length === 0 ? (
        <p className="mt-1 text-sm text-muted">{empty}</p>
      ) : (
        <ul className="mt-1 space-y-1">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 text-sm">
              <span>{item.name}</span>
              <span className="font-semibold tabular-nums">{formatBRL(item.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
