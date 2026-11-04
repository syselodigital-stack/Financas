import { formatBRL, formatDueDate } from '../lib/money'
import type { AllocationResult, IncomeSource } from '../lib/types'

interface SummaryCardsProps {
  result: AllocationResult
  incomes: IncomeSource[]
  dates: Record<string, string>
}

export function SummaryCards({ result, incomes, dates }: SummaryCardsProps) {
  const carried = result.carriedForward
  const transitPositive = carried > 0
  const transitDeficit = carried < 0
  const committed = result.totalAllocated
  const availableReal = result.sobra

  return (
    <section className="grid gap-3 md:grid-cols-2" aria-label="Cartões de saldo">
      <article
        className={`rounded-3xl p-5 ring-1 md:p-6 ${
          transitPositive
            ? 'bg-sage/15 ring-sage/30'
            : transitDeficit
              ? 'bg-alert-soft ring-[#f3c2cb]'
              : 'bg-card ring-line'
        }`}
      >
        <p
          className={`text-xs font-bold tracking-[0.16em] uppercase ${
            transitDeficit ? 'text-alert' : transitPositive ? 'text-teal' : 'text-muted'
          }`}
        >
          {transitDeficit ? 'Saldo devedor acumulado' : 'Saldo Anterior Transitado'}
        </p>
        <p
          className={`mt-3 font-serif text-4xl tracking-tight md:text-5xl ${
            transitDeficit ? 'text-ink' : transitPositive ? 'text-teal-deep' : 'text-ink'
          }`}
        >
          {transitDeficit ? formatBRL(Math.abs(carried)) : formatBRL(Math.max(0, carried))}
        </p>
        <p className="mt-3 max-w-md text-sm leading-6 text-muted">
          {transitPositive
            ? 'Sobra real do mês anterior registrado. Entra no disponível deste mês.'
            : transitDeficit
              ? 'Déficit do mês anterior registrado. Prioridade no abatimento quando houver confirmação de pagamento.'
              : 'Sem fechamento positivo do mês anterior. Nada transitou para este caixa.'}
        </p>
      </article>

      <article className="rounded-3xl bg-card p-5 ring-1 ring-line md:p-6">
        <p className="text-xs font-bold tracking-[0.16em] text-muted uppercase">Renda do mês</p>
        <p className="mt-3 font-serif text-4xl tracking-tight text-ink md:text-5xl">
          {formatBRL(result.monthIncome)}
        </p>
        <ul className="mt-4 space-y-2 text-sm">
          {[...incomes]
            .sort((a, b) => (dates[a.id] ?? '9999').localeCompare(dates[b.id] ?? '9999'))
            .map((income) => {
              const received = dates[income.id] ? formatDueDate(dates[income.id]) : ''
              const inMonth = Boolean(dates[income.id])
              return (
                <li
                  key={income.id}
                  className={`flex items-center justify-between gap-3 ${inMonth ? '' : 'opacity-55'}`}
                >
                  <span>
                    {income.custom ? 'Outra entrada' : income.label}
                    <span className="block text-muted">
                      {income.holder || (income.custom ? 'Serviço sem nome' : '')}
                      {received ? ` · ${received}` : ' · sem data neste mês'}
                    </span>
                  </span>
                  <span className="font-semibold tabular-nums">
                    {inMonth ? formatBRL(income.amount) : formatBRL(0)}
                  </span>
                </li>
              )
            })}
        </ul>
        {incomes.some((income) => !dates[income.id]) && (
          <p className="mt-3 text-sm text-gold">
            Entradas sem data não entram na renda deste mês (não herdadas do mês anterior).
          </p>
        )}
      </article>

      <article className="rounded-3xl bg-card p-5 ring-1 ring-line md:p-6">
        <p className="text-xs font-bold tracking-[0.16em] text-muted uppercase">Total comprometido atual</p>
        <p className="mt-3 font-serif text-4xl tracking-tight text-ink md:text-5xl">{formatBRL(committed)}</p>
        <p className="mt-3 text-sm leading-6 text-muted">
          {committed > 0
            ? 'Só entram lançamentos do diário e contas marcadas como pagas neste mês.'
            : 'Nenhum lançamento ativo neste mês. O mapa previsto ainda não consome o caixa.'}
        </p>
        {result.plannedDue > 0 && (
          <p className="mt-3 text-sm text-gold">
            Previsto no mapa (ainda não confirmado): {formatBRL(result.plannedDue)}.
          </p>
        )}
      </article>

      <article
        className={`rounded-3xl p-5 ring-1 md:p-6 ${
          availableReal > 0 ? 'bg-gold-soft ring-[#efd7a8]' : 'bg-card ring-line'
        }`}
      >
        <p className="text-xs font-bold tracking-[0.16em] text-gold uppercase">Disponível real para alocação</p>
        <p className="mt-3 font-serif text-4xl tracking-tight text-ink md:text-5xl">
          {formatBRL(availableReal)}
        </p>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Renda do mês</dt>
            <dd className="tabular-nums">{formatBRL(result.monthIncome)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">
              {transitDeficit ? 'Saldo devedor (alerta)' : 'Saldo Anterior Transitado'}
            </dt>
            <dd className={`tabular-nums ${transitDeficit ? 'text-alert' : ''}`}>
              {transitDeficit ? `−${formatBRL(Math.abs(carried))}` : formatBRL(Math.max(0, carried))}
            </dd>
          </div>
          <div className="flex justify-between gap-3 border-t border-line pt-2 font-semibold">
            <dt>Recurso do mês</dt>
            <dd className="tabular-nums">{formatBRL(result.totalIncome)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">− Comprometido atual</dt>
            <dd className="tabular-nums">{formatBRL(committed)}</dd>
          </div>
        </dl>
        {result.sombra > 0 && (
          <p className="mt-3 text-sm font-semibold text-alert">
            Compromissos reais descobertos: {formatBRL(result.sombra)}.
          </p>
        )}
      </article>
    </section>
  )
}
