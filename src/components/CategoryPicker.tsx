import { useEffect, useId, useRef, useState } from 'react'
import type { ExpenseCategory, Priority } from '../lib/types'
import { sortedCategories } from '../lib/defaults'

interface CategoryPickerProps {
  categories: ExpenseCategory[]
  value: string
  onChange: (categoryId: string) => void
  onCreate: (input: { name: string; priority_level: Priority }) => ExpenseCategory | null
  variant?: 'chips' | 'select'
}

export function CategoryPicker({
  categories,
  value,
  onChange,
  onCreate,
  variant = 'chips',
}: CategoryPickerProps) {
  const ordered = sortedCategories(categories)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [priority, setPriority] = useState<Priority>(2)
  const [error, setError] = useState('')
  const nameRef = useRef<HTMLInputElement>(null)
  const dialogLabel = useId()

  useEffect(() => {
    if (adding) nameRef.current?.focus()
  }, [adding])

  function openAdd() {
    setName('')
    setPriority(2)
    setError('')
    setAdding(true)
  }

  function closeAdd() {
    setAdding(false)
    setError('')
  }

  function submit() {
    const created = onCreate({ name, priority_level: priority })
    if (!created) {
      setError('Informe um nome que ainda não exista.')
      return
    }
    onChange(created.id)
    closeAdd()
  }

  return (
    <div>
      {variant === 'select' ? (
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Categoria da conta"
            value={value}
            onChange={(event) => {
              if (event.target.value === '__new__') {
                openAdd()
                return
              }
              onChange(event.target.value)
            }}
            className="min-w-[10rem] rounded-xl bg-white px-2 py-1.5 text-sm ring-1 ring-line outline-none focus:ring-2 focus:ring-teal"
          >
            {ordered.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} (N{item.priority_level})
              </option>
            ))}
            <option value="__new__">+ Adicionar nova categoria</option>
          </select>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Categoria">
          {ordered.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={value === item.id}
              onClick={() => onChange(item.id)}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                value === item.id ? 'bg-teal text-white' : 'bg-white text-ink ring-1 ring-line'
              }`}
            >
              {item.name}
              <span className={`ml-1 text-[11px] ${value === item.id ? 'text-white/80' : 'text-muted'}`}>
                N{item.priority_level}
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={openAdd}
            className="rounded-full bg-paper px-3 py-1.5 text-sm font-semibold text-teal ring-1 ring-line"
          >
            + Adicionar nova categoria
          </button>
        </div>
      )}

      {adding && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-teal-deep/40 p-4 sm:items-center"
          role="presentation"
          onClick={closeAdd}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogLabel}
            className="w-full max-w-md rounded-3xl bg-card p-5 shadow-xl ring-1 ring-line"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id={dialogLabel} className="font-serif text-2xl">
              Nova categoria
            </h3>
            <p className="mt-1 text-sm text-muted">
              Digite o nome e o nível de prioridade. A categoria fica salva para os próximos lançamentos.
            </p>
            <label className="mt-4 block">
              <span className="mb-1 block text-xs font-semibold tracking-wide text-muted uppercase">Nome</span>
              <input
                ref={nameRef}
                value={name}
                maxLength={80}
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    submit()
                  }
                  if (event.key === 'Escape') closeAdd()
                }}
                placeholder="Ex.: Farmácia, Escola, Mensalidade..."
                className="w-full rounded-2xl bg-white px-3 py-2.5 ring-1 ring-line outline-none focus:ring-2 focus:ring-teal"
              />
            </label>
            <fieldset className="mt-3">
              <legend className="mb-1 text-xs font-semibold tracking-wide text-muted uppercase">Prioridade</legend>
              <div className="flex flex-wrap gap-2">
                {([1, 2, 3] as Priority[]).map((level) => (
                  <button
                    key={level}
                    type="button"
                    aria-pressed={priority === level}
                    onClick={() => setPriority(level)}
                    className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                      priority === level ? 'bg-teal text-white' : 'bg-white text-ink ring-1 ring-line'
                    }`}
                  >
                    Nível {level}
                  </button>
                ))}
              </div>
            </fieldset>
            {error && <p className="mt-3 text-sm text-alert">{error}</p>}
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={closeAdd}
                className="rounded-full px-4 py-2.5 text-sm font-semibold text-muted ring-1 ring-line"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={submit}
                className="rounded-full bg-teal px-4 py-2.5 text-sm font-semibold text-white"
              >
                Salvar categoria
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
