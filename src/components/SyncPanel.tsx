import { useState } from 'react'
import type { SupabaseConfig } from '../lib/types'
import { createHouseholdClient, explainSyncError, normalizeHouseholdKey, projectUrl, pullRemoteState, saveHouseholdKey } from '../lib/persist'

interface SyncPanelProps {
  config: SupabaseConfig | null
  familyKey: string
  note: string
  onSave: (config: SupabaseConfig) => void
  onFamilyKey: (key: string) => void
  onClear: () => void
}

export function SyncPanel({ config, familyKey, note, onSave, onFamilyKey, onClear }: SyncPanelProps) {
  const [url, setUrl] = useState(config?.url ?? '')
  const [anonKey, setAnonKey] = useState(config?.anonKey ?? '')
  const [key, setKey] = useState(familyKey)
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)

  async function connect() {
    const origin = projectUrl(url)
    const next = { url: origin ?? '', anonKey: anonKey.trim() }
    if (!origin || !next.anonKey) {
      setMessage('Informe a URL https do projeto e a chave anon.')
      return
    }

    setPending(true)
    setMessage('')
    try {
      const checkedKey = normalizeHouseholdKey(key)
      const client = createHouseholdClient(next, checkedKey)
      await pullRemoteState(client)
      const savedKey = saveHouseholdKey(checkedKey)
      onFamilyKey(savedKey)
      onSave(next)
      setMessage('Conexão aceita. Este navegador passa a sincronizar com a família desta chave.')
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Não foi possível conectar.'
      setMessage(explainSyncError(text))
    } finally {
      setPending(false)
    }
  }

  async function copyKey() {
    try {
      await navigator.clipboard.writeText(key.trim())
      setMessage('Chave da família copiada.')
    } catch {
      setMessage('Selecione a chave e copie manualmente.')
    }
  }

  return (
    <section className="rounded-3xl bg-card p-5 ring-1 ring-line md:p-6">
      <h2 className="font-serif text-2xl">Sincronização Supabase</h2>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm leading-6 text-muted">
          <li>
            No SQL Editor do Supabase, execute <code className="rounded bg-paper px-1.5 py-0.5">supabase/schema.sql</code>.
          </li>
          <li>Em Project Settings, API, copie a URL do projeto e a chave anon public.</li>
          <li>Cole abaixo. No outro aparelho, use a mesma chave da família para ver estes lançamentos.</li>
        </ol>
        <p className="mt-3 text-sm font-semibold text-teal">{note}</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold tracking-wide text-muted uppercase">URL do projeto</span>
            <input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://xxxx.supabase.co"
              className="w-full rounded-2xl bg-white px-3 py-2.5 ring-1 ring-line outline-none focus:ring-2 focus:ring-teal"
              autoComplete="off"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold tracking-wide text-muted uppercase">Chave anon</span>
            <input
              type="password"
              value={anonKey}
              onChange={(event) => setAnonKey(event.target.value)}
              className="w-full rounded-2xl bg-white px-3 py-2.5 ring-1 ring-line outline-none focus:ring-2 focus:ring-teal"
              autoComplete="off"
            />
          </label>
          <label className="block md:col-span-2">
            <span className="mb-1 block text-xs font-semibold tracking-wide text-muted uppercase">Chave da família</span>
            <span className="flex gap-2">
              <input
                value={key}
                onChange={(event) => setKey(event.target.value)}
                spellCheck={false}
                className="min-w-0 flex-1 rounded-2xl bg-white px-3 py-2.5 font-mono text-sm ring-1 ring-line outline-none focus:ring-2 focus:ring-teal"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => void copyKey()}
                className="shrink-0 rounded-full px-4 py-2.5 text-sm font-semibold text-ink ring-1 ring-line"
              >
                Copiar
              </button>
            </span>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void connect()}
            disabled={pending}
            className="rounded-full bg-teal px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {pending ? 'Conectando...' : 'Guardar e sincronizar'}
          </button>
          {config && (
            <button
              type="button"
              onClick={onClear}
              className="rounded-full px-4 py-2.5 text-sm font-semibold text-muted ring-1 ring-line"
            >
              Usar só neste navegador
            </button>
          )}
        </div>
        {message && <p className="mt-3 text-sm text-ink">{message}</p>}
    </section>
  )
}
