import { AlertTriangle, Clock } from 'lucide-react'
import { formatBRL, formatDueDate, monthLabel } from '../lib/money'
import {
  dueUrgencyBadgeClass,
  dueUrgencyLabel,
  formatDueCountdown,
  type DueBillAlert,
} from '../lib/dueStatus'

interface DueDateAlertsProps {
  alerts: DueBillAlert[]
}

export function DueDateAlerts({ alerts }: DueDateAlertsProps) {
  if (alerts.length === 0) return null

  const overdueCount = alerts.filter((item) => item.urgency === 'OVERDUE').length
  const soonCount = alerts.length - overdueCount

  return (
    <section
      className="rounded-3xl border border-alert/25 bg-card p-5 shadow-sm ring-1 ring-line md:p-6"
      aria-label="Alertas de vencimento"
    >
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-alert/10 text-alert">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-serif text-2xl">Vencimentos em atenção</h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              Contas atrasadas ou que vencem nos próximos 5 dias.
            </p>
          </div>
        </div>
        <p className="text-sm font-semibold text-ink sm:text-right">
          {overdueCount > 0 && (
            <span className="text-alert">
              {overdueCount} atrasada{overdueCount === 1 ? '' : 's'}
            </span>
          )}
          {overdueCount > 0 && soonCount > 0 ? ' · ' : ''}
          {soonCount > 0 && (
            <span className="text-[#9a5b2f]">
              {soonCount} próxima{soonCount === 1 ? '' : 's'}
            </span>
          )}
        </p>
      </div>

      <ul className="mt-4 space-y-2">
        {alerts.map((alert) => {
          const Icon = alert.urgency === 'OVERDUE' ? AlertTriangle : Clock
          return (
            <li
              key={`${alert.month}:${alert.expenseId}:${alert.dueDate}`}
              className="flex flex-col gap-2 rounded-2xl bg-paper/70 px-4 py-3 shadow-sm ring-1 ring-line sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-start gap-3">
                <Icon
                  className={`mt-0.5 h-4 w-4 shrink-0 ${
                    alert.urgency === 'OVERDUE' ? 'text-alert' : 'text-[#9a5b2f]'
                  }`}
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className="font-semibold text-ink">{alert.name}</p>
                  <p className="text-xs text-muted">
                    {formatDueDate(alert.dueDate) ?? alert.dueDate}
                    {alert.month ? ` · ${monthLabel(alert.month)}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap ${dueUrgencyBadgeClass(
                    alert.urgency,
                  )}`}
                >
                  {dueUrgencyLabel(alert.urgency)}
                </span>
                <span className="text-sm font-semibold text-muted">
                  {formatDueCountdown(alert.dueDate, false)}
                </span>
                <span className="font-serif text-lg font-semibold tabular-nums">{formatBRL(alert.amount)}</span>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
