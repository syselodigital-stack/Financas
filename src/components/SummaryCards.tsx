import { formatBRL, formatDueDate } from '../lib/money'
import type { AllocationResult, IncomeSource } from '../lib/types'

interface SummaryCardsProps {
  result: AllocationResult
  incomes: IncomeSource[]
  dates: Record<string, string>
}

export function SummaryCards({ result, incomes, dates }: SummaryCardsProps) {
  const pending = result.lines.filter((line) => line.status === 'pending')
  const uncovered = result.lines.filter((line) => line.uncovered > 0)

  return (
    <section className="grid gap-3 md:grid-cols-2" aria-label="Cartões de saldo">
      <article
        className={`rounded-3xl p-5 ring-1 md:p-6 ${
          result.sobra > 0 ? 'bg-gold-soft ring-[#efd7a8]' : 'bg-card ring-line'
        }`}
      >
        <p className="text-xs font-bold tracking-[0.16em] text-gold uppercase">Sobra do mês</p>
        <p className="mt-3 font-serif text-4xl tracking-tight text-ink md:text-5xl">{formatBRL(result.sobra)}</p>
        <p className="mt-3 max-w-md text-sm leading-6 text-muted">
          {result.sobra > 0
            ? 'Saldo depois de cobrir as contas e os lançamentos do dia. Este valor alimenta o fundo de reserva.'
            : 'A receita foi toda consumida. O fundo não recebe aporte neste mês.'}
        </p>
      </article>

      <article
        className={`rounded-3xl p-5 ring-1 md:p-6 ${
          result.sombra > 0 ? 'bg-alert-soft ring-[#f3c2cb]' : 'bg-card ring-line'
        }`}
      >
        <p className="text-xs font-bold tracking-[0.16em] text-alert uppercase">Sombra líquida</p>
        <p className="mt-3 font-serif text-4xl tracking-tight text-ink md:text-5xl">{formatBRL(result.sombra)}</p>
        <p className="mt-3 text-sm leading-6 text-muted">
          {result.sombra > 0
            ? 'Obrigações que a receita não conseguiu cobrir.'
            : 'Nenhuma obrigação com valor informado ficou descoberta.'}
        </p>
        {uncovered.length > 0 && (
          <ul className="mt-4 space-y-1 text-sm">
            {uncovered.map((line) => (
              <li key={line.expense.id} className="flex items-center justify-between gap-3">
                <span>{line.expense.name}</span>
                <span className="font-semibold tabular-nums">{formatBRL(line.uncovered)}</span>
              </li>
            ))}
          </ul>
        )}
      </article>

      <article className="rounded-3xl bg-card p-5 ring-1 ring-line">
        <p className="text-xs font-bold tracking-[0.16em] text-muted uppercase">Total de receita</p>
        <p className="mt-2 font-serif text-3xl">{formatBRL(result.totalIncome)}</p>
        <ul className="mt-4 space-y-2 text-sm">
          {[...incomes]
            .sort((a, b) => (dates[a.id] ?? '9999').localeCompare(dates[b.id] ?? '9999'))
            .map((income) => {
              const received = dates[income.id] ? formatDueDate(dates[income.id]) : ''
              return (
                <li key={income.id} className="flex items-center justify-between gap-3">
                  <span>
                    {income.custom ? 'Outra entrada' : income.label}
                    <span className="block text-muted">
                      {income.holder || (income.custom ? 'Serviço sem nome' : '')}
                      {received ? ` · ${received}` : ''}
                    </span>
                  </span>
                  <span className="font-semibold tabular-nums">{formatBRL(income.amount)}</span>
                </li>
              )
            })}
        </ul>
      </article>

      <article className="rounded-3xl bg-card p-5 ring-1 ring-line">
        <p className="text-xs font-bold tracking-[0.16em] text-muted uppercase">Alocado nas despesas</p>
        <p className="mt-2 font-serif text-3xl">{formatBRL(result.totalAllocated)}</p>
        <p className="mt-2 text-sm text-muted">
          Cobertura de {Math.round(result.coverageRate * 100)}% dos valores informados
          {result.totalDue > 0 ? ` (${formatBRL(result.totalDue)})` : ''}.
        </p>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#efe6d6]">
          <div
            className="h-full rounded-full bg-teal"
            style={{ width: `${Math.min(100, Math.round(result.coverageRate * 100))}%` }}
          />
        </div>
        {pending.length > 0 && (
          <p className="mt-3 text-sm text-gold">
            Ainda sem valor: {pending.map((line) => line.expense.name.toLowerCase()).join(', ')}.
          </p>
        )}
      </article>
    </section>
  )
}
