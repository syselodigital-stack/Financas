import { formatBRL, formatDueDate } from '../lib/money'
import type { AllocationResult, IncomeSource } from '../lib/types'

interface SummaryCardsProps {
  result: AllocationResult
  incomes: IncomeSource[]
  dates: Record<string, string>
}

export function SummaryCards({ result, incomes, dates }: SummaryCardsProps) {
  const pending = result.lines.filter((line) => line.status === 'pending')
  const uncovered = result.lines.filter((line) => line.uncovered > 0 && line.expense.id !== 'saldo-devedor-acumulado')
  const carried = result.carriedForward
  const transitPositive = carried > 0
  const transitDeficit = carried < 0

  return (
    <section className="grid gap-3 md:grid-cols-2" aria-label="Cartões de saldo">
      {transitPositive && (
        <article className="rounded-3xl bg-sage/15 p-5 ring-1 ring-sage/30 md:col-span-2 md:p-6">
          <p className="text-xs font-bold tracking-[0.16em] text-teal uppercase">Saldo Anterior Transitado</p>
          <p className="mt-3 font-serif text-4xl tracking-tight text-teal-deep md:text-5xl">
            {formatBRL(carried)}
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
            Sobra do mês anterior registrado. Entra no recurso disponível para abater as contas deste mês.
          </p>
        </article>
      )}

      {transitDeficit && (
        <article
          className="rounded-3xl bg-alert-soft p-5 ring-1 ring-[#f3c2cb] md:col-span-2 md:p-6"
          role="alert"
        >
          <p className="text-xs font-bold tracking-[0.16em] text-alert uppercase">Saldo devedor acumulado</p>
          <p className="mt-3 font-serif text-4xl tracking-tight text-ink md:text-5xl">
            {formatBRL(Math.abs(carried))}
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
            Déficit do mês anterior registrado. Entra como prioridade no abatimento deste mês, antes das demais
            contas.
          </p>
        </article>
      )}

      <article
        className={`rounded-3xl p-5 ring-1 md:p-6 ${
          result.sobra > 0 ? 'bg-gold-soft ring-[#efd7a8]' : 'bg-card ring-line'
        }`}
      >
        <p className="text-xs font-bold tracking-[0.16em] text-gold uppercase">Sobra do mês</p>
        <p className="mt-3 font-serif text-4xl tracking-tight text-ink md:text-5xl">{formatBRL(result.sobra)}</p>
        <p className="mt-3 max-w-md text-sm leading-6 text-muted">
          {result.sobra > 0
            ? 'Saldo depois de cobrir as contas e os lançamentos do dia. Ao registrar o mês, segue para o próximo e alimenta o fundo.'
            : 'A receita foi toda consumida. Nada positivo passa para o próximo mês nem para o fundo.'}
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
            ? 'Obrigações que o recurso disponível não conseguiu cobrir neste mês.'
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
        <p className="text-xs font-bold tracking-[0.16em] text-muted uppercase">Resumo do caixa</p>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-muted">Receita do mês</dt>
            <dd className="font-serif text-2xl tabular-nums">{formatBRL(result.monthIncome)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3 border-t border-line pt-3">
            <dt className="text-muted">
              {transitDeficit ? 'Saldo devedor acumulado' : 'Saldo Anterior Transitado'}
            </dt>
            <dd
              className={`font-semibold tabular-nums ${
                transitDeficit ? 'text-alert' : transitPositive ? 'text-teal' : 'text-ink'
              }`}
            >
              {transitDeficit ? `−${formatBRL(Math.abs(carried))}` : formatBRL(Math.max(0, carried))}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-3 border-t border-line pt-3">
            <dt className="font-semibold text-ink">Recurso total disponível</dt>
            <dd className="font-serif text-2xl tabular-nums text-teal-deep">{formatBRL(result.totalIncome)}</dd>
          </div>
        </dl>
        <ul className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
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
