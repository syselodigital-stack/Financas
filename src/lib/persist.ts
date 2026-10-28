import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { AppState, ExpenseCategory, SupabaseConfig } from './types'
import { sanitizeCategories, sanitizeState } from './defaults'

const STATE_KEY = 'rff-state-v1'
const CONFIG_KEY = 'rff-supabase-config'
const HOUSEHOLD_KEY = 'rff-household-key'
const HOUSEHOLD_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const SHARED_HOUSEHOLD_KEY = 'f4e8c2a1-6b3d-4e7f-9a10-2c5d8e7b6a01'

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
  try {
    localStorage.setItem(HOUSEHOLD_KEY, SHARED_HOUSEHOLD_KEY)
  } catch {
    /* o modo privado pode bloquear o armazenamento */
  }
  return SHARED_HOUSEHOLD_KEY
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
  if (
    (text.includes('household_state') || text.includes('categories')) &&
    (text.includes('does not exist') || text.includes('schema cache') || text.includes('could not find'))
  ) {
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

export async function pullRemoteCategories(client: SupabaseClient): Promise<ExpenseCategory[] | null> {
  const { data, error } = await client
    .from('categories')
    .select('id, name, priority_level')
    .eq('household_key', householdKey())
    .order('priority_level', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    if (isMissingTable(error.message)) return null
    throw new Error(error.message)
  }
  if (!data || data.length === 0) return []
  return sanitizeCategories(data)
}

export async function pushRemoteCategories(client: SupabaseClient, categories: ExpenseCategory[]): Promise<void> {
  const key = householdKey()
  if (categories.length === 0) return

  const rows = categories.map((category) => ({
    id: category.id,
    household_key: key,
    name: category.name,
    priority_level: category.priority_level,
  }))

  const { error } = await client.from('categories').upsert(rows, { onConflict: 'id' })
  if (error) {
    if (isMissingTable(error.message)) return
    throw new Error(error.message)
  }
}

export async function insertRemoteCategory(client: SupabaseClient, category: ExpenseCategory): Promise<void> {
  const { error } = await client.from('categories').upsert(
    {
      id: category.id,
      household_key: householdKey(),
      name: category.name,
      priority_level: category.priority_level,
    },
    { onConflict: 'id' },
  )
  if (error) {
    if (isMissingTable(error.message)) return
    throw new Error(error.message)
  }
}

export async function pullRemoteState(client: SupabaseClient): Promise<AppState | null> {
  const { data, error } = await client
    .from('household_state')
    .select('payload')
    .eq('household_key', householdKey())
    .maybeSingle()

  if (error) throw new Error(error.message)

  const remoteCategories = await pullRemoteCategories(client)
  if (!data?.payload) {
    if (remoteCategories && remoteCategories.length > 0) {
      return sanitizeState({ ...sanitizeState(null), categories: remoteCategories })
    }
    return null
  }

  const state = sanitizeState(data.payload)
  if (remoteCategories && remoteCategories.length > 0) {
    return sanitizeState({ ...state, categories: remoteCategories })
  }
  return state
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
  await pushRemoteCategories(client, state.categories)
}

export function watchHousehold(client: SupabaseClient, onChange: () => void): () => void {
  const key = householdKey()
  const channel = client
    .channel('family-state')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'household_state',
        filter: `household_key=eq.${key}`,
      },
      () => onChange(),
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'categories',
        filter: `household_key=eq.${key}`,
      },
      () => onChange(),
    )
    .subscribe()

  return () => {
    void client.removeChannel(channel)
  }
}

function isMissingTable(message: string): boolean {
  const text = message.toLowerCase()
  return text.includes('does not exist') || text.includes('schema cache') || text.includes('could not find')
}
