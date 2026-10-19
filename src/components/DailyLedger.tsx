import { useEffect, useMemo, useState } from 'react'
import { CurrencyField } from './CurrencyField'
import { dayHeading, formatBRL, mondayIndex, monthDates, weekdayHeaders } from '../lib/money'
import type { DailyCategory, DailyExpense } from '../lib/types'

const CATEGORIES: { id: DailyCategory; label: string }[] = [
  { id: 'alimentacao', label: 'Alimentação' },
  { id: 'combustivel', label: 'Combustível' },
  { id: 'outros', label: 'Outros' },
]

interface DailyLedgerProps {
  month: string
  entries: DailyExpense[]
  onAdd: (entry: Omit<DailyExpense, 'id'>) => void
  onRemove: (id: string) => void
}

export function DailyLedger({ month, entries, onAdd, onRemove }: DailyLedgerProps) {
  const dates = useMemo(() => monthDates(month), [month])
  const [selected, setSelected] = useState(() => preferredDay(month))
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState(0)
  const [category, setCategory] = useState<DailyCategory>('alimentacao')

  useEffect(() => {
    setSelected(preferredDay(month))
  }, [month])

  const monthEntries = entries.filter((entry) => entry.date.startsWith(month))
  const selectedEntries = monthEntries.filter((entry) => entry.date === selected)
  const total = sum(monthEntries)
  const byCategory = {
    alimentacao: sum(monthEntries.filter((entry) => entry.category === 'alimentacao')),
    combustivel: sum(monthEntries.filter((entry) => entry.category === 'combustivel')),
    outros: sum(monthEntries.filter((entry) => entry.category === 'outros')),
  }
  const filledDays = new Set(monthEntries.map((entry) => entry.date)).size
  const leading = mondayIndex(dates[0] ?? `${month}-01`)
  const selectedIndex = dates.indexOf(selected)

  function addEntry() {
    const text = description.trim()
    if (!text || amount <= 0) return
    onAdd({ date: selected, description: text, amount, category })
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
          <h2 className="font-serif text-2xl">Despesas diárias</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted">
            Cada dia do mês aceita quantos lançamentos forem precisos. Alimentação e combustível somam nesses
            itens. O que for marcado como outros entra no nível 1, depois da água.
          </p>
        </div>
        <p className="text-right">
          <span className="block text-xs font-bold tracking-wide text-muted uppercase">Total do mês</span>
          <span className="font-serif text-3xl">{formatBRL(total)}</span>
        </p>
      </div>

      <ul className="mt-4 flex flex-wrap gap-2 text-sm">
        <li className="rounded-full bg-foam px-3 py-1">Alimentação {formatBRL(byCategory.alimentacao)}</li>
        <li className="rounded-full bg-foam px-3 py-1">Combustível {formatBRL(byCategory.combustivel)}</li>
        <li className="rounded-full bg-foam px-3 py-1">Outros {formatBRL(byCategory.outros)}</li>
        <li className="rounded-full bg-[#efe6d6] px-3 py-1">
          {filledDays} de {dates.length} dias com lançamento
        </li>
      </ul>

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
              const dayTotal = sum(monthEntries.filter((entry) => entry.date === date))
              const active = date === selected
              return (
                <button
                  key={date}
                  type="button"
                  aria-pressed={active}
                  aria-label={`${dayHeading(date)}${dayTotal > 0 ? `, ${formatBRL(dayTotal)}` : ''}`}
                  onClick={() => setSelected(date)}
                  className={`min-h-14 rounded-2xl px-1 py-1.5 text-left ${
                    active ? 'bg-teal text-white' : dayTotal > 0 ? 'bg-foam text-ink' : 'bg-paper text-ink'
                  }`}
                >
                  <span className="block text-xs font-semibold">{Number(date.slice(-2))}</span>
                  {dayTotal > 0 && (
                    <span className={`block text-[10px] leading-tight tabular-nums ${active ? 'text-white' : 'text-teal'}`}>
                      {formatBRL(dayTotal).replace(/^R\$\s*/u, '')}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
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
                placeholder="Mercado, padaria, farmácia..."
                className="w-full rounded-2xl bg-white px-3 py-2.5 ring-1 ring-line outline-none focus:ring-2 focus:ring-teal"
              />
            </label>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Categoria">
              {CATEGORIES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={category === item.id}
                  onClick={() => setCategory(item.id)}
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                    category === item.id ? 'bg-teal text-white' : 'bg-white text-ink ring-1 ring-line'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <CurrencyField id="daily-amount" label="Valor do lançamento" value={amount} onChange={setAmount} />
            <button
              type="submit"
              disabled={!description.trim() || amount <= 0}
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
                    {CATEGORIES.find((item) => item.id === entry.category)?.label}
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

function preferredDay(month: string): string {
  const today = new Date()
  const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  if (key === month) return `${month}-${String(today.getDate()).padStart(2, '0')}`
  return `${month}-01`
}

function sum(entries: DailyExpense[]): number {
  return entries.reduce((total, entry) => total + entry.amount, 0)
}
