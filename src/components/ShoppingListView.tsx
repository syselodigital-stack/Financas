import { useMemo, useState } from 'react'
import { AlertTriangle, Check, ShoppingCart, Trash2 } from 'lucide-react'
import { CurrencyField } from './CurrencyField'
import {
  formatShoppingQty,
  SHOPPING_UNITS,
  shoppingBudgetStatus,
  shoppingEstimatedTotal,
  shoppingRealTotal,
} from '../lib/shopping'
import { coerceMoney, formatBRL } from '../lib/money'
import type { ShoppingItem, ShoppingTrip, ShoppingUnit } from '../lib/types'

interface ShoppingListViewProps {
  trip: ShoppingTrip
  onBudget: (budget: number) => void
  onAdd: (item: Omit<ShoppingItem, 'id' | 'inCart'>) => void
  onToggle: (id: string) => void
  onRemove: (id: string) => void
  onConsolidate: (realTotal: number) => void
}

export function ShoppingListView({
  trip,
  onBudget,
  onAdd,
  onToggle,
  onRemove,
  onConsolidate,
}: ShoppingListViewProps) {
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [unit, setUnit] = useState<ShoppingUnit>('un')
  const [price, setPrice] = useState(0)
  const [priceKey, setPriceKey] = useState(0)

  const estimated = useMemo(() => shoppingEstimatedTotal(trip.items), [trip.items])
  const real = useMemo(() => shoppingRealTotal(trip.items), [trip.items])
  const budgetStatus = shoppingBudgetStatus(estimated, trip.budget)
  const inCartCount = trip.items.filter((item) => item.inCart).length

  function submitItem() {
    const label = name.trim()
    const qty = Number(quantity.replace(',', '.'))
    const amount = coerceMoney(price)
    if (!label || !Number.isFinite(qty) || qty <= 0 || amount <= 0) return
    onAdd({
      name: label.slice(0, 80),
      quantity: qty,
      unit,
      estimatedPrice: amount,
    })
    setName('')
    setQuantity('1')
    setUnit('un')
    setPrice(0)
    setPriceKey((key) => key + 1)
  }

  function consolidate() {
    if (real <= 0) return
    const ok = window.confirm(
      `Registrar ${formatBRL(real)} em Alimentação (itens no carrinho) e limpar a lista?`,
    )
    if (!ok) return
    onConsolidate(real)
  }

  return (
    <section className="space-y-4" aria-label="Lista de compras">
      <header className="rounded-3xl bg-card p-5 shadow-sm ring-1 ring-line md:p-6">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-foam text-teal">
            <ShoppingCart className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-bold tracking-[0.18em] text-muted uppercase">Feira</p>
            <h2 className="mt-1 font-serif text-3xl">Lista de compras</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Defina o teto, monte a lista e vá marcando no carrinho. No fim, consolide o valor real no fluxo de caixa.
            </p>
          </div>
        </div>

        <div className="mt-5 max-w-xs">
          <CurrencyField id="shopping-budget" label="Orçamento alvo (teto)" value={trip.budget} onChange={onBudget} />
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryTile
          label="Estimado da lista"
          value={formatBRL(estimated)}
          detail={
            budgetStatus === 'unset'
              ? 'Defina um teto para comparar'
              : budgetStatus === 'ok'
                ? `Dentro do teto ${formatBRL(trip.budget)}`
                : `Ultrapassa o teto ${formatBRL(trip.budget)}`
          }
          tone={budgetStatus === 'over' ? 'alert' : budgetStatus === 'ok' ? 'ok' : 'neutral'}
        />
        <SummaryTile
          label="Real no carrinho"
          value={formatBRL(real)}
          detail={`${inCartCount} de ${trip.items.length} ${trip.items.length === 1 ? 'item' : 'itens'}`}
          tone="neutral"
        />
        <SummaryTile
          label="Diferença estimado − real"
          value={formatBRL(Math.max(0, estimated - real))}
          detail="Ainda fora do carrinho"
          tone="neutral"
        />
      </div>

      {budgetStatus === 'over' && (
        <p
          className="flex items-start gap-2 rounded-2xl bg-alert/10 px-4 py-3 text-sm font-semibold text-alert ring-1 ring-alert/25"
          role="status"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          A lista estimada passou do orçamento alvo. Revise itens ou aumente o teto.
        </p>
      )}

      <form
        className="rounded-3xl bg-card p-4 shadow-sm ring-1 ring-line md:p-5"
        onSubmit={(event) => {
          event.preventDefault()
          submitItem()
        }}
      >
        <h3 className="font-serif text-xl">Adicionar item</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block sm:col-span-2 lg:col-span-2">
            <span className="mb-1 block text-xs font-semibold tracking-wide text-muted uppercase">Produto</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Arroz, feijão, banana..."
              maxLength={80}
              className="w-full rounded-2xl bg-white px-3 py-2.5 ring-1 ring-line outline-none focus:ring-2 focus:ring-teal"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold tracking-wide text-muted uppercase">Qtd</span>
            <input
              inputMode="decimal"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              className="w-full rounded-2xl bg-white px-3 py-2.5 text-right tabular-nums ring-1 ring-line outline-none focus:ring-2 focus:ring-teal"
            />
          </label>
          <fieldset>
            <legend className="mb-1 text-xs font-semibold tracking-wide text-muted uppercase">Unidade</legend>
            <div className="flex gap-1.5">
              {SHOPPING_UNITS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={unit === option.id}
                  onClick={() => setUnit(option.id)}
                  className={`flex-1 rounded-2xl px-2 py-2.5 text-sm font-semibold ${
                    unit === option.id ? 'bg-teal text-white' : 'bg-white text-ink ring-1 ring-line'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="sm:col-span-2 lg:col-span-2">
            <CurrencyField
              key={priceKey}
              id="shopping-item-price"
              label="Preço estimado (linha)"
              value={price}
              onChange={setPrice}
            />
          </div>
          <div className="flex items-end sm:col-span-2 lg:col-span-2">
            <button
              type="submit"
              disabled={!name.trim() || coerceMoney(price) <= 0 || !(Number(quantity.replace(',', '.')) > 0)}
              className="w-full rounded-full bg-teal px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              Adicionar à lista
            </button>
          </div>
        </div>
      </form>

      <div className="rounded-3xl bg-card p-4 shadow-sm ring-1 ring-line md:p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-serif text-xl">Itens</h3>
          <p className="text-sm text-muted">
            {trip.items.length === 0 ? 'Lista vazia' : `${inCartCount} no carrinho`}
          </p>
        </div>

        {trip.items.length === 0 ? (
          <p className="mt-4 text-sm text-muted">Adicione produtos para acompanhar o teto na feira.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {trip.items.map((item) => (
              <li
                key={item.id}
                className={`flex items-center gap-3 rounded-2xl px-3 py-3 ring-1 ring-line ${
                  item.inCart ? 'bg-sage/15' : 'bg-white'
                }`}
              >
                <button
                  type="button"
                  aria-pressed={item.inCart}
                  aria-label={item.inCart ? `Remover ${item.name} do carrinho` : `Marcar ${item.name} no carrinho`}
                  onClick={() => onToggle(item.id)}
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                    item.inCart ? 'bg-sage text-white' : 'bg-paper text-muted ring-1 ring-line'
                  }`}
                >
                  <Check className="h-5 w-5" aria-hidden="true" />
                </button>
                <div className="min-w-0 flex-1">
                  <p className={`font-semibold ${item.inCart ? 'line-through text-muted' : 'text-ink'}`}>{item.name}</p>
                  <p className="text-xs text-muted">
                    {formatShoppingQty(item.quantity, item.unit)}
                    {item.inCart ? ' · no carrinho' : ''}
                  </p>
                </div>
                <span className="shrink-0 font-semibold tabular-nums">{formatBRL(item.estimatedPrice)}</span>
                <button
                  type="button"
                  aria-label={`Excluir ${item.name}`}
                  onClick={() => onRemove(item.id)}
                  className="shrink-0 rounded-full p-2 text-alert"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          disabled={real <= 0}
          onClick={consolidate}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-teal px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          <ShoppingCart className="h-4 w-4" aria-hidden="true" />
          Consolidar no fluxo de caixa · {formatBRL(real)}
        </button>
        <p className="mt-2 text-center text-xs text-muted">
          Registra o valor dos itens no carrinho em Alimentação no diário do mês.
        </p>
      </div>
    </section>
  )
}

function SummaryTile({
  label,
  value,
  detail,
  tone,
}: {
  label: string
  value: string
  detail: string
  tone: 'ok' | 'alert' | 'neutral'
}) {
  const toneClass =
    tone === 'ok'
      ? 'bg-sage/15 ring-sage/30 text-teal-deep'
      : tone === 'alert'
        ? 'bg-alert/10 ring-alert/30 text-alert'
        : 'bg-card ring-line text-ink'

  return (
    <article className={`rounded-3xl px-4 py-3 shadow-sm ring-1 ${toneClass}`}>
      <p className="text-xs font-bold tracking-wide text-muted uppercase">{label}</p>
      <p className="mt-1 font-serif text-2xl tabular-nums">{value}</p>
      <p className="text-sm opacity-80">{detail}</p>
    </article>
  )
}
