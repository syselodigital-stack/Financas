import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { categoryColor, sortedCategories } from '../lib/defaults'
import { formatBRL, formatDueDate } from '../lib/money'
import type { AllocationResult, CaixaContract, DailyExpense, ExpenseCategory } from '../lib/types'

const LEVEL_META = [
  { level: 1 as const, label: 'Nível 1', detail: 'Sobrevivência / Teto', color: '#114743' },
  { level: 2 as const, label: 'Nível 2', detail: 'Essenciais', color: '#1e4d6b' },
  { level: 3 as const, label: 'Nível 3', detail: 'Carnês / Comerciais', color: '#9a5b2f' },
]

type CutRate = 0 | 0.1 | 0.2 | 1

interface ReportsViewProps {
  result: AllocationResult
  categories: ExpenseCategory[]
  entries: DailyExpense[]
  month: string
  monthLabel: string
  caixa: CaixaContract
  reserveOpening: number
}

export function ReportsView({
  result,
  categories,
  entries,
  month,
  monthLabel,
  caixa,
  reserveOpening,
}: ReportsViewProps) {
  const [cutRate, setCutRate] = useState<CutRate>(0.1)

  const analysis = useMemo(
    () => buildAnalysis(result, categories, entries, month, caixa, reserveOpening, cutRate),
    [result, categories, entries, month, caixa, reserveOpening, cutRate],
  )

  return (
    <section className="space-y-5" aria-label="Relatórios e análise de gargalos">
      <header className="rounded-3xl border border-line bg-card p-5 shadow-sm md:p-6">
        <p className="text-xs font-bold tracking-[0.18em] text-muted uppercase">Relatórios</p>
        <h2 className="mt-1 font-serif text-3xl">Gastos por categoria · {monthLabel}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
          Lista completa dos gastos dentro de cada categoria, com o valor individual e o total da categoria.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard label="Receita total" value={formatBRL(analysis.income)} hint="Entradas do mês" tone="teal" />
        <KpiCard
          label="Total gasto / comprometido"
          value={formatBRL(analysis.committed)}
          hint={`${Math.round(analysis.coverage * 100)}% da receita alocada`}
          tone="amber"
        />
        <KpiCard
          label="Sobra líquida / fundo potencial"
          value={formatBRL(analysis.sobra)}
          hint={
            analysis.sobra > 0
              ? `Reserva projetada ${formatBRL(analysis.reservePotential)}`
              : 'Sem aporte ao fundo neste mês'
          }
          tone={analysis.sobra > 0 ? 'sage' : 'alert'}
        />
      </div>

      <article className="rounded-3xl border border-line bg-card p-5 shadow-sm md:p-6">
        <div className="flex flex-col justify-between gap-2 md:flex-row md:items-end">
          <div>
            <h3 className="font-serif text-2xl">Categorias e gastos</h3>
            <p className="mt-1 text-sm text-muted">
              Cada categoria mostra o total e a lista de todos os gastos lançados nela.
            </p>
          </div>
          <p className="text-sm font-semibold text-ink">
            {analysis.categoryGroups.length} categoria{analysis.categoryGroups.length === 1 ? '' : 's'} ·{' '}
            {analysis.itemCount} gasto{analysis.itemCount === 1 ? '' : 's'}
          </p>
        </div>

        {analysis.categoryGroups.length === 0 ? (
          <p className="mt-4 text-sm text-muted">Nenhum gasto informado neste mês.</p>
        ) : (
          <div className="mt-5 space-y-4">
            {analysis.categoryGroups.map((group, index) => (
              <section key={group.id} className="overflow-hidden rounded-2xl border border-line bg-paper/40">
                <header className="flex items-start justify-between gap-3 border-b border-line bg-card px-4 py-3">
                  <div className="flex items-start gap-3">
                    <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ background: group.color }} />
                    <div>
                      <h4 className="font-serif text-xl">{group.name}</h4>
                      <p className="text-xs text-muted">
                        Nível {group.priority} · {group.items.length} gasto{group.items.length === 1 ? '' : 's'}
                        {group.share > 0 ? ` · ${group.share.toFixed(0)}% do comprometido` : ''}
                      </p>
                    </div>
                  </div>
                  <p className="font-serif text-2xl tabular-nums">{formatBRL(group.total)}</p>
                </header>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-line text-xs tracking-wide text-muted uppercase">
                        <th className="px-4 py-2.5 font-semibold">#</th>
                        <th className="px-4 py-2.5 font-semibold">Gasto</th>
                        <th className="px-4 py-2.5 font-semibold">Origem</th>
                        <th className="px-4 py-2.5 font-semibold">Nível</th>
                        <th className="px-4 py-2.5 text-right font-semibold">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.items.map((item, itemIndex) => (
                        <tr
                          key={item.id}
                          className={`border-b border-line last:border-b-0 ${
                            itemIndex % 2 === 1 ? 'bg-card/70' : ''
                          }`}
                        >
                          <td className="px-4 py-2.5 tabular-nums text-muted">
                            {String(itemIndex + 1).padStart(2, '0')}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="font-semibold">{item.name}</span>
                            {item.detail && <span className="mt-0.5 block text-xs text-muted">{item.detail}</span>}
                          </td>
                          <td className="px-4 py-2.5 text-muted">{item.origin}</td>
                          <td className="px-4 py-2.5 text-muted">N{item.priority}</td>
                          <td className="px-4 py-2.5 text-right font-semibold tabular-nums">
                            {formatBRL(item.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-card">
                        <td colSpan={4} className="px-4 py-3 text-sm font-semibold">
                          Total da categoria {group.name}
                        </td>
                        <td className="px-4 py-3 text-right font-serif text-lg font-semibold tabular-nums">
                          {formatBRL(group.total)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {index === 0 && analysis.categoryRanking.length > 1 && (
                  <div className="border-t border-line px-4 py-3 md:hidden">
                    <p className="text-xs text-muted">Categoria com maior peso neste mês.</p>
                  </div>
                )}
              </section>
            ))}
          </div>
        )}
      </article>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-3xl border border-line bg-card p-5 shadow-sm md:p-6">
          <h3 className="font-serif text-2xl">Alocação por nível</h3>
          <p className="mt-1 text-sm text-muted">Peso percentual do Nível 1, 2 e 3.</p>
          <div className="mt-4 grid items-center gap-4 sm:grid-cols-[200px_1fr]">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analysis.prioritySlices}
                    dataKey="value"
                    nameKey="label"
                    innerRadius={48}
                    outerRadius={76}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {analysis.prioritySlices.map((slice) => (
                      <Cell key={slice.level} fill={slice.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatBRL(Number(value ?? 0))} contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="space-y-2">
              {analysis.prioritySlices.map((slice) => (
                <li key={slice.level} className="flex items-center justify-between gap-3 rounded-2xl bg-paper/70 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: slice.color }} />
                    <span className="text-sm font-semibold">{slice.label}</span>
                  </div>
                  <span className="text-sm tabular-nums">
                    {formatBRL(slice.value)} · {slice.share.toFixed(0)}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </article>

        <article className="rounded-3xl border border-line bg-card p-5 shadow-sm md:p-6">
          <h3 className="font-serif text-2xl">Totais por categoria</h3>
          <p className="mt-1 text-sm text-muted">Comparativo rápido do valor de cada categoria.</p>
          <div className="mt-4 h-56">
            {analysis.categoryRanking.length === 0 ? (
              <p className="text-sm text-muted">Sem gastos informados neste mês.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={analysis.categoryRanking}
                  layout="vertical"
                  margin={{ left: 8, right: 12, top: 4, bottom: 4 }}
                >
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={96}
                    tick={{ fill: '#5f584e', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip formatter={(value) => formatBRL(Number(value ?? 0))} contentStyle={tooltipStyle} />
                  <Bar dataKey="total" radius={[0, 8, 8, 0]} maxBarSize={22}>
                    {analysis.categoryRanking.map((item) => (
                      <Cell key={item.id} fill={item.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>
      </div>

      <article className="rounded-3xl border border-line bg-card p-5 shadow-sm md:p-6">
        <h3 className="font-serif text-2xl">Alertas e sugestões</h3>
        <p className="mt-1 text-sm text-muted">Leituras automáticas com base no orçamento do mês.</p>
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {analysis.alerts.map((alert) => (
            <li
              key={alert.id}
              className={`rounded-2xl border px-4 py-3 ${
                alert.tone === 'alert'
                  ? 'border-[#f1c4cd] bg-alert-soft'
                  : alert.tone === 'warn'
                    ? 'border-[#ead7a8] bg-gold-soft'
                    : 'border-[#cfe8d8] bg-sage-soft'
              }`}
            >
              <p
                className={`text-xs font-bold tracking-wide uppercase ${
                  alert.tone === 'alert' ? 'text-alert' : alert.tone === 'warn' ? 'text-gold' : 'text-sage'
                }`}
              >
                {alert.title}
              </p>
              <p className="mt-1 text-sm leading-6 text-ink">{alert.body}</p>
            </li>
          ))}
        </ul>
      </article>

      <article className="rounded-3xl border border-line bg-card p-5 shadow-sm md:p-6">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <h3 className="font-serif text-2xl">Ação e corte de gastos</h3>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">
              Simule redução em despesas dos níveis 2 e 3 e veja o impacto na sobra e na recuperação da Habitação CAIXA.
            </p>
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Percentual de corte">
            {([0.1, 0.2, 1] as CutRate[]).map((rate) => (
              <button
                key={rate}
                type="button"
                aria-pressed={cutRate === rate}
                onClick={() => setCutRate(rate)}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                  cutRate === rate ? 'bg-teal text-white' : 'bg-white text-ink ring-1 ring-line'
                }`}
              >
                {rate === 1 ? '-100%' : `-${Math.round(rate * 100)}%`}
              </button>
            ))}
            <button
              type="button"
              aria-pressed={cutRate === 0}
              onClick={() => setCutRate(0)}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                cutRate === 0 ? 'bg-teal text-white' : 'bg-white text-ink ring-1 ring-line'
              }`}
            >
              Sem corte
            </button>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-[#ead7a8] bg-gold-soft/70 px-4 py-3">
          <p className="text-xs font-bold tracking-wide text-gold uppercase">Oportunidade de otimização</p>
          <p className="mt-1 text-sm text-ink">
            As 3 maiores despesas fora do Nível 1 concentram {formatBRL(analysis.topCutsTotal)} neste mês.
          </p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-3">
            {analysis.topCuts.map((item, index) => (
              <li key={item.id} className="rounded-2xl bg-card px-3 py-2.5 ring-1 ring-line">
                <p className="text-xs font-bold text-muted">#{index + 1}</p>
                <p className="font-semibold">{item.name}</p>
                <p className="text-xs text-muted">Nível {item.priority}</p>
                <p className="mt-1 font-serif text-xl tabular-nums">{formatBRL(item.due)}</p>
              </li>
            ))}
            {analysis.topCuts.length === 0 && (
              <li className="sm:col-span-3 text-sm text-muted">Não há despesas de Nível 2 ou 3 com valor neste mês.</li>
            )}
          </ul>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl bg-paper/80 px-4 py-3 ring-1 ring-line">
            <p className="text-xs font-bold tracking-wide text-muted uppercase">Economia simulada</p>
            <p className="mt-1 font-serif text-3xl tabular-nums">{formatBRL(analysis.simulatedSaving)}</p>
            <p className="text-sm text-muted">Corte de {cutLabel(cutRate)} em N2 + N3</p>
          </div>
          <div className="rounded-2xl bg-paper/80 px-4 py-3 ring-1 ring-line">
            <p className="text-xs font-bold tracking-wide text-muted uppercase">Novo saldo remanescente</p>
            <p className={`mt-1 font-serif text-3xl tabular-nums ${analysis.simulatedSobra < 0 ? 'text-alert' : ''}`}>
              {formatBRL(analysis.simulatedSobra)}
            </p>
            <p className="text-sm text-muted">
              Antes {formatBRL(analysis.sobra)} · diferença {formatBRL(analysis.simulatedSobra - analysis.sobra)}
            </p>
          </div>
          <div className="rounded-2xl bg-paper/80 px-4 py-3 ring-1 ring-line">
            <p className="text-xs font-bold tracking-wide text-muted uppercase">Recuperação Habitação CAIXA</p>
            {analysis.housingDebt > 0 ? (
              <>
                <p className="mt-1 font-serif text-2xl">
                  {analysis.monthsWithoutCut === null
                    ? '—'
                    : `${analysis.monthsWithoutCut} mes${analysis.monthsWithoutCut === 1 ? '' : 'es'}`}
                  <span className="mx-2 text-muted">→</span>
                  {analysis.monthsWithCut === null
                    ? '—'
                    : `${analysis.monthsWithCut} mes${analysis.monthsWithCut === 1 ? '' : 'es'}`}
                </p>
                <p className="text-sm text-muted">
                  Atraso {formatBRL(analysis.housingDebt)} · sem corte vs. com corte
                </p>
                {analysis.monthsGained !== null && analysis.monthsGained > 0 && (
                  <p className="mt-1 text-sm font-semibold text-sage">
                    {analysis.monthsGained} mês{analysis.monthsGained === 1 ? '' : 'es'} a menos com o corte.
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="mt-1 font-serif text-2xl text-sage">Em dia</p>
                <p className="text-sm text-muted">Sem parcelas em atraso registradas no contrato CAIXA.</p>
              </>
            )}
          </div>
        </div>
      </article>
    </section>
  )
}

function KpiCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string
  value: string
  hint: string
  tone: 'teal' | 'amber' | 'sage' | 'alert'
}) {
  const accent =
    tone === 'teal'
      ? 'border-l-teal'
      : tone === 'amber'
        ? 'border-l-gold'
        : tone === 'sage'
          ? 'border-l-sage'
          : 'border-l-alert'
  return (
    <article className={`rounded-3xl border border-line border-l-4 bg-card px-4 py-4 shadow-sm ${accent}`}>
      <p className="text-xs font-bold tracking-wide text-muted uppercase">{label}</p>
      <p className="mt-2 font-serif text-3xl tabular-nums">{value}</p>
      <p className="mt-1 text-sm text-muted">{hint}</p>
    </article>
  )
}

function cutLabel(rate: CutRate): string {
  if (rate === 0) return '0%'
  if (rate === 1) return '100%'
  return `${Math.round(rate * 100)}%`
}

function monthsToClear(debt: number, monthly: number): number | null {
  if (debt <= 0) return 0
  if (monthly <= 0) return null
  return Math.ceil(debt / monthly)
}

interface CategoryItem {
  id: string
  name: string
  detail: string
  origin: string
  priority: 1 | 2 | 3
  amount: number
}

function buildAnalysis(
  result: AllocationResult,
  categories: ExpenseCategory[],
  entries: DailyExpense[],
  month: string,
  caixa: CaixaContract,
  reserveOpening: number,
  cutRate: CutRate,
) {
  const income = result.totalIncome
  const committed = result.totalAllocated
  const sobra = result.sobra
  const coverage = result.coverageRate
  const reservePotential = Math.max(0, reserveOpening) + Math.max(0, sobra)

  const byLevel = { 1: 0, 2: 0, 3: 0 }
  for (const line of result.lines) {
    const level = line.expense.priority
    if (level === 1 || level === 2 || level === 3) byLevel[level] += line.due
  }
  const levelTotal = byLevel[1] + byLevel[2] + byLevel[3]
  const prioritySlices = LEVEL_META.map((meta) => {
    const value = byLevel[meta.level]
    return {
      ...meta,
      value,
      share: levelTotal > 0 ? (value / levelTotal) * 100 : 0,
    }
  })

  const ordered = sortedCategories(categories)
  const monthEntries = entries.filter((entry) => entry.date.startsWith(month))

  const categoryGroups = ordered
    .map((category, index) => {
      const plannedOnly: CategoryItem[] = result.lines
        .filter((line) => line.expense.categoryId === category.id && !line.locked && line.expense.amount > 0)
        .map((line) => ({
          id: line.expense.id,
          name: line.expense.name || 'Conta',
          detail: line.expense.detail ?? '',
          origin: 'Previsto' as const,
          priority: line.expense.priority,
          amount: line.expense.amount,
        }))

      const dayItems: CategoryItem[] = monthEntries
        .filter((entry) => entry.categoryId === category.id)
        .map((entry) => ({
          id: `day-${entry.id}`,
          name: entry.description,
          detail: formatDueDate(entry.date) ?? '',
          origin: 'Diário' as const,
          priority: category.priority_level,
          amount: entry.amount,
        }))

      const locked: CategoryItem[] =
        dayItems.length > 0
          ? []
          : result.lines
              .filter((line) => line.expense.categoryId === category.id && line.locked && line.due > 0)
              .map((line) => ({
                id: line.expense.id,
                name: line.expense.name || 'Lançamentos do dia',
                detail: line.expense.detail ?? '',
                origin: 'Diário' as const,
                priority: line.expense.priority,
                amount: line.due,
              }))

      const detailedItems = [...plannedOnly, ...dayItems, ...locked].sort(
        (a, b) => b.amount - a.amount || a.name.localeCompare(b.name, 'pt-BR'),
      )

      const total = detailedItems.reduce((sum, item) => sum + item.amount, 0)
      return {
        id: category.id,
        name: category.name,
        priority: category.priority_level,
        color: categoryColor(index),
        total,
        share: committed > 0 ? (total / committed) * 100 : levelTotal > 0 ? (total / levelTotal) * 100 : 0,
        items: detailedItems,
      }
    })
    .filter((group) => group.items.length > 0)
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'pt-BR'))

  const itemCount = categoryGroups.reduce((sum, group) => sum + group.items.length, 0)

  const categoryRanking = categoryGroups.map((group) => ({
    id: group.id,
    name: group.name,
    total: group.total,
    color: group.color,
  }))

  const flexibleLines = result.lines
    .filter((line) => !line.locked && line.due > 0 && line.expense.priority !== 1)
    .sort((a, b) => b.due - a.due)
  const topCuts = flexibleLines.slice(0, 3).map((line) => ({
    id: line.expense.id,
    name: line.expense.name || 'Conta',
    priority: line.expense.priority,
    due: line.due,
  }))
  const topCutsTotal = topCuts.reduce((sum, item) => sum + item.due, 0)

  const flexibleDue = byLevel[2] + byLevel[3]
  const simulatedSaving = flexibleDue * cutRate
  const simulatedSobra = sobra + simulatedSaving

  const housingLine = result.lines.find((line) => line.expense.id === 'caixa')
  const installment = caixa.oldestAmount > 0 ? caixa.oldestAmount : housingLine?.due || 0
  const housingDebt = Math.max(0, caixa.overdueInstallments) * installment
  const monthsWithoutCut = monthsToClear(housingDebt, sobra)
  const monthsWithCut = monthsToClear(housingDebt, simulatedSobra)
  const monthsGained =
    monthsWithoutCut !== null && monthsWithCut !== null ? Math.max(0, monthsWithoutCut - monthsWithCut) : null

  const level3Share = income > 0 ? byLevel[3] / income : 0
  const alerts: Array<{ id: string; title: string; body: string; tone: 'alert' | 'warn' | 'ok' }> = []

  if (caixa.overdueInstallments > 0) {
    alerts.push({
      id: 'caixa',
      title: 'Habitação CAIXA',
      body: `${caixa.overdueInstallments} parcela${caixa.overdueInstallments === 1 ? '' : 's'} em atraso (${formatBRL(housingDebt)}). Priorize o Nível 1 e use a sobra simulada para acelerar a quitação.`,
      tone: 'alert',
    })
  } else {
    alerts.push({
      id: 'caixa-ok',
      title: 'Habitação CAIXA',
      body: 'Sem atraso registrado. Mantenha a parcela do teto coberta antes de liberar novos gastos de Nível 3.',
      tone: 'ok',
    })
  }

  if (level3Share > 0.15) {
    alerts.push({
      id: 'nivel3',
      title: 'Nível 3 acima da margem',
      body: `Carnês e comerciais consomem ${(level3Share * 100).toFixed(0)}% da receita. Considere congelar novas compras e renegociar parcelas.`,
      tone: 'warn',
    })
  } else {
    alerts.push({
      id: 'nivel3-ok',
      title: 'Nível 3 sob controle',
      body: 'Os gastos comerciais estão dentro de uma faixa confortável em relação à receita deste mês.',
      tone: 'ok',
    })
  }

  if (sobra <= 0) {
    alerts.push({
      id: 'sobra',
      title: 'Sem sobra líquida',
      body: 'A receita foi consumida. Corte Nível 2 e 3 antes de aumentar o fundo de reserva.',
      tone: 'alert',
    })
  } else if (byLevel[2] + byLevel[3] > sobra * 2) {
    alerts.push({
      id: 'corte',
      title: 'Margem apertada',
      body: 'Níveis 2 e 3 juntos pesam mais que o dobro da sobra. Um corte de 10% a 20% libera fôlego rápido.',
      tone: 'warn',
    })
  } else {
    alerts.push({
      id: 'sobra-ok',
      title: 'Sobra disponível',
      body: `Há ${formatBRL(sobra)} para reforçar o fundo ou antecipar o atraso da CAIXA, se houver.`,
      tone: 'ok',
    })
  }

  if (categoryRanking[0]) {
    alerts.push({
      id: 'top-cat',
      title: 'Maior categoria',
      body: `${categoryRanking[0].name} concentra ${formatBRL(categoryRanking[0].total)} neste mês.`,
      tone: 'warn',
    })
  }

  return {
    income,
    committed,
    sobra,
    coverage,
    reservePotential,
    prioritySlices,
    categoryGroups,
    categoryRanking,
    itemCount,
    topCuts,
    topCutsTotal,
    simulatedSaving,
    simulatedSobra,
    housingDebt,
    monthsWithoutCut,
    monthsWithCut,
    monthsGained,
    alerts,
  }
}

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid #e4d8c4',
  background: '#fffdf8',
  fontSize: 12,
}
