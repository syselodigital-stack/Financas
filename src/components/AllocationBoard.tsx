import { CurrencyField } from './CurrencyField'
import { LEVELS } from '../lib/defaults'
import { formatBRL } from '../lib/money'
import type { AllocationLine, AllocationResult, Priority } from '../lib/types'

const LEVEL_COLOR: Record<Priority, string> = {
  1: '#0f766e',
  2: '#1e4d6b',
  3: '#9a5b2f',
}

interface MonthPayment {
  paid: boolean
  installments: number
}

interface AllocationBoardProps {
  result: AllocationResult
  delinquent: boolean
  monthLabel: string
  payments: Record<string, MonthPayment>
  onAmount: (id: string, amount: number) => void
  onPayment: (id: string, patch: Partial<MonthPayment>) => void
}

export function AllocationBoard({ result, delinquent, monthLabel, payments, onAmount, onPayment }: AllocationBoardProps) {
  const payable = result.lines.filter((line) => canSettle(line))
  const paidCount = payable.filter((line) => payments[line.expense.id]?.paid).length
  const segments = [
    ...result.lines
      .filter((line) => line.allocated > 0)
      .map((line) => ({
        id: line.expense.id,
        name: line.expense.name,
        amount: line.allocated,
        color: LEVEL_COLOR[line.expense.priority],
      })),
    ...(result.sobra > 0
      ? [{ id: 'sobra', name: 'Sobra do mês', amount: result.sobra, color: '#c2882d' }]
      : []),
  ]

  return (
    <section id="abatimento" className="space-y-4">
      <div className="rounded-3xl bg-card p-5 ring-1 ring-line md:p-6">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <h2 className="font-serif text-2xl">Abatimento automático</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted">
              A receita percorre o nível 1, depois o nível 2 e o nível 3. Os valores fixos aparecem em texto.
              Alimentação, combustível, dentistas e IPTU continuam editáveis.
            </p>
          </div>
          <p className="text-sm font-semibold text-ink">
            {payable.length === 0
              ? 'Nenhuma despesa com valor neste mês.'
              : `${paidCount} de ${payable.length} pagas em ${monthLabel}.`}
          </p>
        </div>

        <div className="mt-5">
          <div
            className="flex h-3 overflow-hidden rounded-full bg-[#efe6d6]"
            role="img"
            aria-label="Distribuição da receita entre despesas e sobra"
          >
            {result.totalIncome === 0
              ? null
              : segments.map((segment) => (
                  <div
                    key={segment.id}
                    title={`${segment.name}: ${formatBRL(segment.amount)}`}
                    style={{
                      width: `${(segment.amount / result.totalIncome) * 100}%`,
                      background: segment.color,
                    }}
                  />
                ))}
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted">
            {LEVELS.map((item) => (
              <li key={item.priority} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: LEVEL_COLOR[item.priority] }} />
                {item.title}
              </li>
            ))}
            <li className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#c2882d]" />
              Sobra
            </li>
          </ul>
        </div>
      </div>

      {LEVELS.map((level) => {
        const lines = result.lines.filter((line) => line.expense.priority === level.priority)
        if (lines.length === 0) return null
        return (
          <section key={level.priority} className="overflow-hidden rounded-3xl bg-card ring-1 ring-line">
            <header className="flex items-start gap-3 border-b border-line px-5 py-4 md:px-6">
              <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ background: LEVEL_COLOR[level.priority] }} />
              <div>
                <h3 className="font-serif text-xl">
                  {level.title}
                  <span className="ml-2 text-base font-normal text-muted">{level.name}</span>
                </h3>
                <p className="mt-0.5 text-sm text-muted">{level.description}</p>
              </div>
            </header>

            <ul className="space-y-3 p-3 md:hidden">
              {lines.map((line) => (
                <ExpenseCard
                  key={line.expense.id}
                  line={line}
                  emphasized={delinquent && line.expense.id === 'caixa'}
                  payment={payments[line.expense.id]}
                  onAmount={onAmount}
                  onPayment={onPayment}
                />
              ))}
            </ul>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs tracking-wide text-muted uppercase">
                    <th className="px-4 py-3 font-semibold">Ordem</th>
                    <th className="px-4 py-3 font-semibold">Descrição</th>
                    <th className="px-4 py-3 font-semibold">Nível</th>
                    <th className="px-4 py-3 font-semibold">Previsto</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, index) => (
                    <tr
                      key={line.expense.id}
                      className={`border-b border-line last:border-b-0 ${
                        delinquent && line.expense.id === 'caixa'
                          ? 'bg-alert-soft'
                          : index % 2 === 1
                            ? 'bg-paper/70'
                            : 'bg-card'
                      }`}
                    >
                      <td className="px-4 py-4 font-semibold tabular-nums">{String(line.order).padStart(2, '0')}</td>
                      <td className="px-4 py-4">
                        <span className="block font-semibold">{line.expense.name}</span>
                        <span className="text-muted">{line.expense.detail}</span>
                      </td>
                      <td className="px-4 py-4">
                        <LevelBadge priority={line.expense.priority} />
                      </td>
                      <td className="px-4 py-4">
                        <AmountCell line={line} fieldId={`expense-desktop-${line.expense.id}`} onAmount={onAmount} />
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge line={line} paid={payments[line.expense.id]?.paid ?? false} />
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <ActionCell
                          line={line}
                          payment={payments[line.expense.id]}
                          onPayment={(patch) => onPayment(line.expense.id, patch)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )
      })}
    </section>
  )
}

function ExpenseCard({
  line,
  emphasized,
  payment,
  onAmount,
  onPayment,
}: {
  line: AllocationLine
  emphasized: boolean
  payment?: MonthPayment
  onAmount: (id: string, amount: number) => void
  onPayment: (id: string, patch: Partial<MonthPayment>) => void
}) {
  return (
    <li className={`rounded-2xl border border-line p-4 ${emphasized ? 'bg-alert-soft' : 'bg-paper/40'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold text-muted">
            {String(line.order).padStart(2, '0')} · Nível {line.expense.priority}
          </p>
          <p className="font-semibold">{line.expense.name}</p>
          <p className="text-sm text-muted">{line.expense.detail}</p>
        </div>
        <StatusBadge line={line} paid={payment?.paid ?? false} />
      </div>
      <div className="mt-3">
        <AmountCell line={line} fieldId={`expense-${line.expense.id}`} onAmount={onAmount} />
      </div>
      {canSettle(line) && (
        <div className="mt-3 border-t border-line pt-3">
          <ActionCell line={line} payment={payment} onPayment={(patch) => onPayment(line.expense.id, patch)} />
        </div>
      )}
    </li>
  )
}

function AmountCell({
  line,
  fieldId,
  onAmount,
}: {
  line: AllocationLine
  fieldId: string
  onAmount: (id: string, amount: number) => void
}) {
  const editable = !line.locked && line.expense.editable
  return (
    <div className="max-w-[11rem]">
      {editable ? (
        <CurrencyField
          id={fieldId}
          label="Previsto"
          labelVisibility="mobile"
          value={line.expense.amount}
          onChange={(amount) => onAmount(line.expense.id, amount)}
        />
      ) : (
        <p className="font-semibold tabular-nums">{formatBRL(line.due)}</p>
      )}
      {!line.locked && line.dailyAmount > 0 && (
        <p className="mt-1 text-xs text-muted">Diário {formatBRL(line.dailyAmount)}</p>
      )}
      {line.uncovered > 0 && <p className="mt-1 text-xs font-semibold text-alert">Falta {formatBRL(line.uncovered)}</p>}
    </div>
  )
}

function ActionCell({
  line,
  payment,
  onPayment,
}: {
  line: AllocationLine
  payment?: MonthPayment
  onPayment: (patch: Partial<MonthPayment>) => void
}) {
  if (!canSettle(line)) return <span className="text-muted">—</span>
  const paid = payment?.paid ?? false
  const installments = payment?.installments ?? 0

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-pressed={paid}
        onClick={() => onPayment({ paid: !paid })}
        className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold whitespace-nowrap ${
          paid ? 'bg-sage text-white' : 'bg-white text-ink ring-1 ring-line'
        }`}
      >
        {paid ? 'Pago' : 'Marcar pago'}
      </button>
      <label className="flex items-center gap-1.5 text-xs font-semibold text-muted">
        <span>Parcelas</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={480}
          step={1}
          aria-label={`Parcelas de ${line.expense.name}`}
          value={installments}
          onChange={(event) => {
            const parsed = event.target.value === '' ? 0 : Math.floor(Number(event.target.value))
            if (!Number.isFinite(parsed)) return
            onPayment({ installments: Math.max(0, Math.min(480, parsed)) })
          }}
          className="w-14 rounded-xl bg-white px-2 py-1.5 text-right text-sm font-semibold text-ink tabular-nums ring-1 ring-line outline-none focus:ring-2 focus:ring-teal"
        />
      </label>
    </div>
  )
}

function StatusBadge({ line, paid }: { line: AllocationLine; paid: boolean }) {
  const badge = paid
    ? { label: 'Pago', className: 'bg-sage-soft text-sage' }
    : line.status === 'uncovered'
      ? { label: 'Descoberto', className: 'bg-alert-soft text-alert' }
      : line.status === 'partial'
        ? { label: 'Parcial', className: 'bg-gold-soft text-gold' }
        : line.status === 'pending'
          ? { label: 'A informar', className: 'bg-[#f3eee4] text-muted' }
          : { label: 'Pendente', className: 'bg-gold-soft text-gold' }

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap ${badge.className}`}>
      {badge.label}
    </span>
  )
}

function LevelBadge({ priority }: { priority: Priority }) {
  return (
    <span
      className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-white"
      style={{ background: LEVEL_COLOR[priority] }}
    >
      Nível {priority}
    </span>
  )
}

function canSettle(line: AllocationLine) {
  return !line.locked && line.due > 0
}
