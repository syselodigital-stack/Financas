import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { AppState, SupabaseConfig } from './types'
import { sanitizeState } from './defaults'

const STATE_KEY = 'rff-state-v1'
const CONFIG_KEY = 'rff-supabase-config'
const HOUSEHOLD_KEY = 'rff-household-key'
const HOUSEHOLD_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function loadLocalState(): AppState {
  try {
    const raw = localStorage.getItem(STATE_KEY)
    if (!raw) return sanitizeState(null)
    return sanitizeState(JSON.parse(raw))
  } catch {
    return sanitizeState(null)
  }
}

export function saveLocalState(state: AppState): void {
  localStorage.setItem(STATE_KEY, JSON.stringify(state))
}

export function householdKey(): string {
  const existing = localStorage.getItem(HOUSEHOLD_KEY)
  if (existing && HOUSEHOLD_PATTERN.test(existing)) return existing
  const created = crypto.randomUUID()
  localStorage.setItem(HOUSEHOLD_KEY, created)
  return created
}

export function normalizeHouseholdKey(value: string): string {
  const key = value.trim()
  if (!HOUSEHOLD_PATTERN.test(key)) {
    throw new Error('A chave da família precisa ser o identificador copiado do outro aparelho.')
  }
  return key
}

export function saveHouseholdKey(value: string): string {
  const key = normalizeHouseholdKey(value)
  localStorage.setItem(HOUSEHOLD_KEY, key)
  return key
}

export function loadSupabaseConfig(): SupabaseConfig | null {
  const fromEnv = readEnvConfig()
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SupabaseConfig>
      if (parsed.url?.trim() && parsed.anonKey?.trim()) {
        return { url: parsed.url.trim(), anonKey: parsed.anonKey.trim() }
      }
    }
  } catch {
    /* usa o ambiente */
  }
  return fromEnv
}

export function saveSupabaseConfig(config: SupabaseConfig | null): void {
  if (!config) {
    localStorage.removeItem(CONFIG_KEY)
    return
  }
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
}

function readEnvConfig(): SupabaseConfig | null {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim()
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
  if (!url || !anonKey) return null
  return { url, anonKey }
}

export function projectUrl(value: string): string | null {
  try {
    const url = new URL(value.trim())
    if (url.protocol !== 'https:') return null
    return url.origin
  } catch {
    return null
  }
}

export function explainSyncError(message: string): string {
  const text = message.toLowerCase()
  if (text.includes('household_state') && (text.includes('does not exist') || text.includes('schema cache') || text.includes('could not find'))) {
    return 'A tabela ainda não existe. Execute supabase/schema.sql no SQL Editor do projeto e tente de novo.'
  }
  if (text.includes('invalid api key') || text.includes('apikey') || text.includes('jwt')) {
    return 'A chave anon não foi aceita. Copie a chave public em Project Settings, API.'
  }
  if (text.includes('failed to fetch') || text.includes('network') || text.includes('load failed')) {
    return 'Não foi possível alcançar o projeto. Confira a URL, no formato https://xxxx.supabase.co.'
  }
  if (text.includes('row-level security') || text.includes('permission denied') || text.includes('42501')) {
    return 'O banco recusou o acesso. Execute supabase/schema.sql de novo para criar a política da família.'
  }
  return message
}

export function createHouseholdClient(config: SupabaseConfig, key = householdKey()): SupabaseClient {
  return createClient(config.url, config.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: { 'x-household-key': key },
    },
  })
}

export async function pullRemoteState(client: SupabaseClient): Promise<AppState | null> {
  const { data, error } = await client
    .from('household_state')
    .select('payload')
    .eq('household_key', householdKey())
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data?.payload) return null
  return sanitizeState(data.payload)
}

export async function pushRemoteState(client: SupabaseClient, state: AppState): Promise<void> {
  const { error } = await client.from('household_state').upsert(
    {
      household_key: householdKey(),
      payload: state,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'household_key' },
  )

  if (error) throw new Error(error.message)
}
