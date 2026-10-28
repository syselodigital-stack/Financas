import { CurrencyField } from './CurrencyField'
import { CategoryPicker } from './CategoryPicker'
import { categoryColor, sortedCategories } from '../lib/defaults'
import { daysInMonth, formatBRL, formatDueDate } from '../lib/money'
import type { AllocationLine, AllocationResult, DailyExpense, ExpenseCategory, Priority } from '../lib/types'

interface MonthPayment {
  paid: boolean
  installments: number
}

interface AllocationBoardProps {
  result: AllocationResult
  month: string
  monthLabel: string
  payments: Record<string, MonthPayment>
  dueDates: Record<string, string>
  entries: DailyExpense[]
  categories: ExpenseCategory[]
  onAmount: (id: string, amount: number) => void
  onName: (id: string, name: string) => void
  onCategory: (id: string, categoryId: string) => void
  onPayment: (id: string, patch: Partial<MonthPayment>) => void
  onDueDate: (id: string, date: string) => void
  onAdd: () => void
  onRemove: (id: string) => void
  onCreateCategory: (input: { name: string; priority_level: Priority }) => ExpenseCategory | null
}

export function AllocationBoard({
  result,
  month,
  monthLabel,
  payments,
  dueDates,
  entries,
  categories,
  onAmount,
  onName,
  onCategory,
  onPayment,
  onDueDate,
  onAdd,
  onRemove,
  onCreateCategory,
}: AllocationBoardProps) {
  const ordered = sortedCategories(categories)
  const colorById = Object.fromEntries(ordered.map((category, index) => [category.id, categoryColor(index)]))
  const payable = result.lines.filter((line) => canSettle(line))
  const paidCount = payable.filter((line) => payments[line.expense.id]?.paid).length
  const segments = [
    ...result.lines
      .filter((line) => line.allocated > 0)
      .map((line) => ({
        id: line.expense.id,
        name: line.expense.name,
        amount: line.allocated,
        color: colorById[line.expense.categoryId] ?? categoryColor(0),
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
              Contas e lançamentos do dia ficam agrupados pelas categorias cadastradas, com o nível de prioridade de cada
              uma.
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 md:items-end">
            <p className="text-sm font-semibold text-ink">
              {payable.length === 0
                ? 'Nenhuma despesa com valor neste mês.'
                : `${paidCount} de ${payable.length} pagas em ${monthLabel}.`}
            </p>
            <button
              type="button"
              onClick={onAdd}
              className="rounded-full bg-teal px-4 py-2 text-sm font-semibold text-white"
            >
              Incluir conta
            </button>
          </div>
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
            {ordered.map((category) => (
              <li key={category.id} className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: colorById[category.id] }}
                />
                {category.name}
                <span className="text-[11px]">N{category.priority_level}</span>
              </li>
            ))}
            <li className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#c2882d]" />
              Sobra
            </li>
          </ul>
        </div>
      </div>

      {ordered.map((category) => {
        const lines = result.lines.filter((line) => line.expense.categoryId === category.id)
        const visible = lines.filter((line) => !line.locked)
        const dayItems = entries.filter((entry) => entry.date.startsWith(month) && entry.categoryId === category.id)
        const total = lines.reduce((sum, line) => sum + line.due, 0)
        return (
          <section key={category.id} className="overflow-hidden rounded-3xl bg-card ring-1 ring-line">
            <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4 md:px-6">
              <div className="flex items-start gap-3">
                <span
                  className="mt-1 h-3 w-3 shrink-0 rounded-full"
                  style={{ background: colorById[category.id] }}
                />
                <div>
                  <h3 className="font-serif text-xl">{category.name}</h3>
                  <p className="mt-0.5 text-sm text-muted">
                    Prioridade nível {category.priority_level}. Contas previstas e lançamentos do dia nesta categoria.
                  </p>
                </div>
              </div>
              <p className="font-serif text-2xl tabular-nums">{formatBRL(total)}</p>
            </header>

            {visible.length > 0 && (
              <>
                <ul className="space-y-3 p-3 md:hidden">
                  {visible.map((line) => (
                    <ExpenseCard
                      key={line.expense.id}
                      line={line}
                      month={month}
                      payment={payments[line.expense.id]}
                      dueDate={dueDates[line.expense.id] ?? ''}
                      categories={categories}
                      onAmount={onAmount}
                      onName={onName}
                      onCategory={onCategory}
                      onPayment={onPayment}
                      onRemove={onRemove}
                      onCreateCategory={onCreateCategory}
                      onDueDate={(date) => onDueDate(line.expense.id, date)}
                    />
                  ))}
                </ul>

                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[920px] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-line text-xs tracking-wide text-muted uppercase">
                        <th className="px-4 py-3 font-semibold">Ordem</th>
                        <th className="px-4 py-3 font-semibold">Descrição</th>
                        <th className="px-4 py-3 font-semibold">Categoria</th>
                        <th className="px-4 py-3 font-semibold">Previsto</th>
                        <th className="px-4 py-3 font-semibold">Dia</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3 font-semibold">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((line, index) => (
                        <tr
                          key={line.expense.id}
                          className={`border-b border-line last:border-b-0 ${
                            index % 2 === 1 ? 'bg-paper/70' : 'bg-card'
                          }`}
                        >
                          <td className="px-4 py-4 font-semibold tabular-nums">{String(line.order).padStart(2, '0')}</td>
                          <td className="px-4 py-4">
                            <AccountName
                              line={line}
                              fieldId={`expense-name-desktop-${line.expense.id}`}
                              onName={onName}
                              onRemove={onRemove}
                            />
                          </td>
                          <td className="px-4 py-4">
                            <CategorySelect
                              line={line}
                              categories={categories}
                              onCategory={onCategory}
                              onCreateCategory={onCreateCategory}
                            />
                          </td>
                          <td className="px-4 py-4">
                            <AmountCell line={line} fieldId={`expense-desktop-${line.expense.id}`} onAmount={onAmount} />
                          </td>
                          <td className="px-4 py-4">
                            {line.locked ? (
                              <span className="text-muted">—</span>
                            ) : (
                              <DueDayField
                                month={month}
                                name={line.expense.name}
                                value={dueDates[line.expense.id] ?? ''}
                                onChange={(date) => onDueDate(line.expense.id, date)}
                              />
                            )}
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
              </>
            )}
            <DayEntryList entries={dayItems} />
          </section>
        )
      })}
    </section>
  )
}

function ExpenseCard({
  line,
  month,
  payment,
  dueDate,
  categories,
  onAmount,
  onName,
  onCategory,
  onPayment,
  onDueDate,
  onRemove,
  onCreateCategory,
}: {
  line: AllocationLine
  month: string
  payment?: MonthPayment
  dueDate: string
  categories: ExpenseCategory[]
  onAmount: (id: string, amount: number) => void
  onName: (id: string, name: string) => void
  onCategory: (id: string, categoryId: string) => void
  onPayment: (id: string, patch: Partial<MonthPayment>) => void
  onDueDate: (date: string) => void
  onRemove: (id: string) => void
  onCreateCategory: (input: { name: string; priority_level: Priority }) => ExpenseCategory | null
}) {
  return (
    <li className="rounded-2xl border border-line bg-paper/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-muted">{String(line.order).padStart(2, '0')}</p>
          <div className="mt-1">
            <AccountName line={line} fieldId={`expense-name-${line.expense.id}`} onName={onName} onRemove={onRemove} />
          </div>
        </div>
        <StatusBadge line={line} paid={payment?.paid ?? false} />
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <AmountCell line={line} fieldId={`expense-${line.expense.id}`} onAmount={onAmount} />
        {!line.locked && (
          <label className="block">
            <span className="mb-1 block text-xs font-semibold tracking-wide text-muted uppercase">Dia</span>
            <DueDayField month={month} name={line.expense.name} value={dueDate} onChange={onDueDate} />
          </label>
        )}
      </div>
      {!line.locked && (
        <div className="mt-3">
          <span className="mb-1 block text-xs font-semibold tracking-wide text-muted uppercase">Categoria</span>
          <CategorySelect
            line={line}
            categories={categories}
            onCategory={onCategory}
            onCreateCategory={onCreateCategory}
          />
        </div>
      )}
      {canSettle(line) && (
        <div className="mt-3 border-t border-line pt-3">
          <ActionCell line={line} payment={payment} onPayment={(patch) => onPayment(line.expense.id, patch)} />
        </div>
      )}
    </li>
  )
}

function CategorySelect({
  line,
  categories,
  onCategory,
  onCreateCategory,
}: {
  line: AllocationLine
  categories: ExpenseCategory[]
  onCategory: (id: string, categoryId: string) => void
  onCreateCategory: (input: { name: string; priority_level: Priority }) => ExpenseCategory | null
}) {
  if (line.locked) {
    const name = categories.find((item) => item.id === line.expense.categoryId)?.name ?? 'Categoria'
    return <span className="text-sm text-muted">{name}</span>
  }

  return (
    <CategoryPicker
      categories={categories}
      value={line.expense.categoryId}
      onChange={(categoryId) => onCategory(line.expense.id, categoryId)}
      onCreate={onCreateCategory}
      variant="select"
    />
  )
}

function AccountName({
  line,
  fieldId,
  onName,
  onRemove,
}: {
  line: AllocationLine
  fieldId: string
  onName: (id: string, name: string) => void
  onRemove: (id: string) => void
}) {
  if (line.locked) {
    return (
      <div>
        <span className="block font-semibold">{line.expense.name}</span>
        <span className="text-sm text-muted">{line.expense.detail}</span>
      </div>
    )
  }

  return (
    <div>
      <input
        id={fieldId}
        data-expense-name={line.expense.id}
        aria-label={`Nome da conta ${line.expense.name || 'nova'}`}
        value={line.expense.name}
        maxLength={80}
        onChange={(event) => onName(line.expense.id, event.target.value)}
        className="w-full rounded-xl bg-white px-2 py-1.5 text-sm font-semibold ring-1 ring-line outline-none focus:ring-2 focus:ring-teal"
      />
      {line.expense.detail && <p className="mt-1 text-sm text-muted">{line.expense.detail}</p>}
      <button
        type="button"
        onClick={() => onRemove(line.expense.id)}
        className="mt-1 text-xs font-semibold text-alert"
      >
        Excluir
      </button>
    </div>
  )
}

function DayEntryList({ entries }: { entries: DailyExpense[] }) {
  return (
    <div className="border-t border-line px-5 py-4 md:px-6">
      <p className="text-xs font-semibold tracking-wide text-muted uppercase">Lançado no dia</p>
      {entries.length === 0 ? (
        <p className="mt-2 text-sm text-muted">Nenhum lançamento nesta categoria.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {entries.map((entry) => (
            <li key={entry.id} className="flex items-center justify-between gap-3 text-sm">
              <span>
                <span className="font-semibold">{entry.description}</span>
                <span className="ml-2 text-muted">{formatDueDate(entry.date)}</span>
              </span>
              <span className="font-semibold tabular-nums">{formatBRL(entry.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function DueDayField({
  month,
  name,
  value,
  onChange,
}: {
  month: string
  name: string
  value: string
  onChange: (date: string) => void
}) {
  const lastDay = String(daysInMonth(month)).padStart(2, '0')
  return (
    <input
      type="date"
      aria-label={`Dia de ${name}`}
      min={`${month}-01`}
      max={`${month}-${lastDay}`}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full max-w-[11rem] rounded-xl bg-white px-2 py-1.5 text-sm ring-1 ring-line outline-none focus:ring-2 focus:ring-teal"
    />
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
  const editable = !line.locked
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

function canSettle(line: AllocationLine) {
  return !line.locked && line.due > 0
}
