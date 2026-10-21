import { formatBRL, formatDueDate } from '../lib/money'
import type { CaixaContract } from '../lib/types'

export function MoraAlert({ caixa, onOpen }: { caixa: CaixaContract; onOpen: () => void }) {
  const dueDate = formatDueDate(caixa.oldestDueDate)
  const amount = caixa.oldestAmount > 0 ? caixa.oldestAmount : 0

  return (
    <section role="alert" className="border-y border-[#f0b8c3] bg-alert-soft">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] text-alert uppercase">Alerta de mora habitacional</p>
          <h2 className="mt-1 font-serif text-2xl text-alert md:text-3xl">
            {caixa.overdueInstallments} parcelas em atraso na CAIXA
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6f2432]">
            Quite primeiro a parcela mais antiga
            {dueDate ? `, vencida em ${dueDate},` : ''} no valor de {formatBRL(amount)}, antes de
            cobrir as demais despesas. O financiamento continua a primeira conta.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex shrink-0 items-center justify-center rounded-full bg-alert px-4 py-2.5 text-sm font-semibold text-white"
        >
          Pagar a parcela mais antiga
        </button>
      </div>
    </section>
  )
}
