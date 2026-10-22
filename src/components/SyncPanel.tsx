import { useState } from 'react'
import type { SupabaseConfig } from '../lib/types'
import { createHouseholdClient, explainSyncError, projectUrl, pullRemoteState } from '../lib/persist'

interface SyncPanelProps {
  config: SupabaseConfig | null
  note: string
  onSave: (config: SupabaseConfig) => void
}

export function SyncPanel({ config, note, onSave }: SyncPanelProps) {
  const [url, setUrl] = useState(config?.url ?? '')
  const [anonKey, setAnonKey] = useState(config?.anonKey ?? '')
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
      const client = createHouseholdClient(next)
      await pullRemoteState(client)
      onSave(next)
      setMessage('Conectado. Os outros navegadores passam a ver os mesmos lançamentos.')
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Não foi possível conectar.'
      setMessage(explainSyncError(text))
    } finally {
      setPending(false)
    }
  }

  return (
    <section className="rounded-3xl bg-card p-5 ring-1 ring-line md:p-6">
      <h2 className="font-serif text-2xl">Família em tempo real</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
        Qualquer navegador que abrir este endereço vê os mesmos lançamentos. Uma alteração chega nos outros em poucos
        segundos, sem colar chave e sem configurar de novo.
      </p>
      <p className="mt-3 text-sm font-semibold text-teal">{note}</p>
      {!config && (
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
          <button
            type="button"
            onClick={() => void connect()}
            disabled={pending}
            className="w-fit rounded-full bg-teal px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {pending ? 'Conectando...' : 'Conectar'}
          </button>
        </div>
      )}
      {message && <p className="mt-3 text-sm text-ink">{message}</p>}
    </section>
  )
}
