import { CurrencyField } from './CurrencyField'
import { MORA_THRESHOLD } from '../lib/engine'
import type { CaixaContract } from '../lib/types'

interface CaixaPanelProps {
  caixa: CaixaContract
  onChange: (caixa: CaixaContract) => void
}

export function CaixaPanel({ caixa, onChange }: CaixaPanelProps) {
  const delinquent = caixa.overdueInstallments >= MORA_THRESHOLD

  return (
    <section className="rounded-3xl bg-card p-5 ring-1 ring-line md:p-6">
      <h2 className="font-serif text-2xl">Contrato habitacional CAIXA</h2>
      <p className="mt-1 text-sm leading-6 text-muted">
        O alerta visual aparece quando o status chega a {MORA_THRESHOLD} parcelas ou mais. Abaixo disso, a
        casa segue como a primeira conta.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold tracking-wide text-muted uppercase">
            Parcelas em atraso
          </span>
          <input
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            aria-describedby="mora-regra"
            value={caixa.overdueInstallments}
            className="w-full rounded-2xl bg-white px-3 py-2.5 font-semibold tabular-nums ring-1 ring-line outline-none focus:ring-2 focus:ring-teal"
            onChange={(event) =>
              onChange({
                ...caixa,
                overdueInstallments: Math.max(0, Math.floor(Number(event.target.value) || 0)),
              })
            }
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold tracking-wide text-muted uppercase">
            Parcela mais antiga
          </span>
          <input
            type="date"
            value={caixa.oldestDueDate}
            className="w-full rounded-2xl bg-white px-3 py-2.5 ring-1 ring-line outline-none focus:ring-2 focus:ring-teal"
            onChange={(event) => onChange({ ...caixa, oldestDueDate: event.target.value })}
          />
        </label>
        <CurrencyField
          id="caixa-oldest-amount"
          label="Valor da parcela antiga"
          value={caixa.oldestAmount}
          onChange={(oldestAmount) => onChange({ ...caixa, oldestAmount })}
        />
      </div>
      <p id="mora-regra" className={`mt-4 text-sm font-medium ${delinquent ? 'text-alert' : 'text-sage'}`}>
        {delinquent
          ? 'Status de mora ativo. A parcela mais antiga tem prioridade de pagamento.'
          : `Status atual: ${caixa.overdueInstallments} ${caixa.overdueInstallments === 1 ? 'parcela' : 'parcelas'}. O alerta começa em ${MORA_THRESHOLD}.`}
      </p>
    </section>
  )
}
