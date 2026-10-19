import { useEffect, useRef } from 'react'
import { CurrencyField } from './CurrencyField'
import { daysInMonth, formatBRL } from '../lib/money'
import type { IncomeSource } from '../lib/types'

interface IncomePanelProps {
  incomes: IncomeSource[]
  total: number
  month: string
  dates: Record<string, string>
  onAmount: (id: string, amount: number) => void
  onHolder: (id: string, holder: string) => void
  onDate: (id: string, date: string) => void
  onAdd: () => void
  onRemove: (id: string) => void
}

export function IncomePanel({ incomes, total, month, dates, onAmount, onHolder, onDate, onAdd, onRemove }: IncomePanelProps) {
  const count = useRef(incomes.length)

  useEffect(() => {
    if (incomes.length > count.current) {
      const added = incomes[incomes.length - 1]
      if (added?.custom) document.getElementById(`income-name-${added.id}`)?.focus()
    }
    count.current = incomes.length
  }, [incomes])

  return (
    <section className="rounded-3xl bg-card p-5 ring-1 ring-line md:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl">Entradas de caixa</h2>
          <p className="mt-1 text-sm text-muted">
            Os salários e os serviços entram juntos no abatimento. A data de cada entrada vale só para este mês.
          </p>
        </div>
        <p className="text-right">
          <span className="block text-xs font-bold tracking-wide text-muted uppercase">Total</span>
          <span className="font-serif text-2xl">{formatBRL(total)}</span>
        </p>
      </div>

      <div className="mt-5 space-y-4">
        {incomes.map((income) => {
          const lastDay = String(daysInMonth(month)).padStart(2, '0')
          const name = income.holder || (income.custom ? 'serviço' : income.label)
          return (
          <div key={income.id} className="grid gap-3 rounded-2xl bg-paper/70 p-3 sm:grid-cols-2 sm:items-end">
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-semibold tracking-wide text-muted uppercase">
                {income.custom ? 'Serviço' : income.label}
              </span>
              <input
                id={income.custom ? `income-name-${income.id}` : undefined}
                value={income.holder}
                placeholder={income.custom ? 'Nome do serviço' : undefined}
                aria-label={income.custom ? 'Nome do serviço' : `Origem de ${income.label}`}
                className="w-full rounded-2xl bg-white px-3 py-2.5 ring-1 ring-line outline-none focus:ring-2 focus:ring-teal"
                onChange={(event) => onHolder(income.id, event.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold tracking-wide text-muted uppercase">Data</span>
              <input
                type="date"
                aria-label={`Data de ${name}`}
                min={`${month}-01`}
                max={`${month}-${lastDay}`}
                value={dates[income.id] ?? ''}
                className="w-full rounded-2xl bg-white px-3 py-2.5 ring-1 ring-line outline-none focus:ring-2 focus:ring-teal"
                onChange={(event) => onDate(income.id, event.target.value)}
              />
            </label>
            <CurrencyField
              id={`income-${income.id}`}
              label="Valor"
              value={income.amount}
              onChange={(amount) => onAmount(income.id, amount)}
            />
            {income.custom && (
              <button
                type="button"
                onClick={() => onRemove(income.id)}
                className="w-fit rounded-full px-3 py-2.5 text-sm font-semibold text-alert ring-1 ring-[#f3c2cb] sm:col-span-2"
              >
                Remover
              </button>
            )}
          </div>
          )
        })}
      </div>

      <button
        type="button"
        onClick={onAdd}
        className="mt-4 rounded-full bg-teal px-4 py-2.5 text-sm font-semibold text-white"
      >
        Incluir outra entrada
      </button>
    </section>
  )
}
