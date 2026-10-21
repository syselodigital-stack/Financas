import { SummaryCards } from './SummaryCards'
import { formatBRL } from '../lib/money'
import type { TabId } from './AppTabs'
import type { AllocationResult, IncomeSource } from '../lib/types'

interface PanelHomeProps {
  result: AllocationResult
  incomes: IncomeSource[]
  dates: Record<string, string>
  filledDays: number
  monthDays: number
  dailyTotal: number
  registered: boolean
  paidCount: number
  payableCount: number
  installmentCount: number
  onOpen: (tab: TabId) => void
}

export function PanelHome({
  result,
  incomes,
  dates,
  filledDays,
  monthDays,
  dailyTotal,
  registered,
  paidCount,
  payableCount,
  installmentCount,
  onOpen,
}: PanelHomeProps) {
  return (
    <div className="space-y-4">
      <SummaryCards result={result} incomes={incomes} dates={dates} />
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatusTile label="Diário do mês" value={`${filledDays} de ${monthDays} dias`} detail={formatBRL(dailyTotal)} />
        <StatusTile
          label="Cobertura"
          value={`${Math.round(result.coverageRate * 100)}%`}
          detail={result.sombra > 0 ? `${formatBRL(result.sombra)} em aberto` : 'Mapa coberto'}
        />
        <StatusTile
          label="Pagamentos"
          value={payableCount === 0 ? 'Nada a pagar' : `${paidCount} de ${payableCount}`}
          detail={
            installmentCount > 0
              ? `${installmentCount} ${installmentCount === 1 ? 'parcela lançada' : 'parcelas lançadas'}`
              : 'Sem parcelas neste mês'
          }
        />
        <StatusTile
          label="Fundo"
          value={registered ? 'Mês registrado' : 'Ainda aberto'}
          detail={result.sobra > 0 ? `Sobra ${formatBRL(result.sobra)}` : 'Sem aporte neste mês'}
        />
      </section>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={() => onOpen('diario')} className="rounded-full bg-teal px-4 py-2.5 text-sm font-semibold text-white">
          Lançar no diário
        </button>
        <button type="button" onClick={() => onOpen('diario')} className="rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-ink ring-1 ring-line">
          Ver o mês
        </button>
        <button type="button" onClick={() => onOpen('fundo')} className="rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-ink ring-1 ring-line">
          Ver o fundo
        </button>
      </div>
    </div>
  )
}

function StatusTile({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article className="rounded-3xl bg-card px-4 py-3 ring-1 ring-line">
      <p className="text-xs font-bold tracking-wide text-muted uppercase">{label}</p>
      <p className="mt-1 font-serif text-2xl">{value}</p>
      <p className="text-sm text-muted">{detail}</p>
    </article>
  )
}
