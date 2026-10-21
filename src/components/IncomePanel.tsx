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
  const fixed = incomes.filter((income) => !income.custom)
  const extras = incomes.filter((income) => income.custom)
  const lastDay = String(daysInMonth(month)).padStart(2, '0')

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
          <p className="mt-1 max-w-xl text-sm text-muted">
            Os salários ficam aqui. Cada serviço incluído vai para a lista ao lado, com descrição, valor e a data deste mês.
          </p>
        </div>
        <p className="text-right">
          <span className="block text-xs font-bold tracking-wide text-muted uppercase">Total</span>
          <span className="font-serif text-2xl">{formatBRL(total)}</span>
        </p>
      </div>

      <div className="mt-5 grid items-start gap-4 md:grid-cols-[minmax(0,1fr)_minmax(22rem,0.9fr)]">
        <div className="space-y-4">
          {fixed.map((income) => {
            const name = income.holder || income.label
            return (
              <div key={income.id} className="grid gap-3 rounded-2xl bg-paper/70 p-3 sm:grid-cols-2 sm:items-end">
                <label className="block sm:col-span-2">
                  <span className="mb-1 block text-xs font-semibold tracking-wide text-muted uppercase">{income.label}</span>
                  <input
                    value={income.holder}
                    aria-label={`Origem de ${income.label}`}
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
              </div>
            )
          })}
        </div>

        <aside className="rounded-2xl bg-paper/70 p-3 ring-1 ring-line">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-serif text-xl">Outras entradas</h3>
            <button
              type="button"
              onClick={onAdd}
              className="rounded-full bg-teal px-3 py-1.5 text-sm font-semibold text-white"
            >
              Incluir
            </button>
          </div>
          <p className="mt-1 text-sm text-muted">A lista rola aqui dentro quando houver várias.</p>

          {extras.length === 0 ? (
            <p className="mt-4 text-sm text-muted">Nenhuma outra entrada.</p>
          ) : (
            <ul className="mt-3 max-h-80 divide-y divide-line overflow-y-auto">
              {extras.map((income) => (
                <li key={income.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 py-2">
                  <input
                    id={`income-name-${income.id}`}
                    value={income.holder}
                    placeholder="Descrição"
                    aria-label="Descrição da entrada"
                    className="w-full min-w-0 rounded-xl bg-white px-3 py-2 ring-1 ring-line outline-none focus:ring-2 focus:ring-teal"
                    onChange={(event) => onHolder(income.id, event.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => onRemove(income.id)}
                    className="text-sm font-semibold text-alert"
                  >
                    Excluir
                  </button>
                  <input
                    type="date"
                    aria-label={`Data de ${income.holder || 'entrada'}`}
                    min={`${month}-01`}
                    max={`${month}-${lastDay}`}
                    value={dates[income.id] ?? ''}
                    className="w-full min-w-0 rounded-xl bg-white px-2 py-2 text-sm ring-1 ring-line outline-none focus:ring-2 focus:ring-teal"
                    onChange={(event) => onDate(income.id, event.target.value)}
                  />
                  <CurrencyField
                    id={`income-${income.id}`}
                    label="Valor"
                    labelVisibility="hidden"
                    value={income.amount}
                    onChange={(amount) => onAmount(income.id, amount)}
                  />
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </section>
  )
}
