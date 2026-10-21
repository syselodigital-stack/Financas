export type TabId = 'painel' | 'caixa' | 'diario' | 'fundo' | 'ajustes'

export const TABS: { id: TabId; label: string; short: string }[] = [
  { id: 'painel', label: 'Painel', short: 'Painel' },
  { id: 'caixa', label: 'Caixa', short: 'Caixa' },
  { id: 'diario', label: 'Diário', short: 'Diário' },
  { id: 'fundo', label: 'Fundo', short: 'Fundo' },
  { id: 'ajustes', label: 'Ajustes', short: 'Ajustes' },
]

const TAB_KEY = 'rff-tab'

export function readTab(): TabId {
  if (window.location.hash === '#diario' || window.location.hash === '#abatimento') return 'diario'
  try {
    const saved = sessionStorage.getItem(TAB_KEY)
    if (saved === 'mapa') return 'diario'
    if (saved && TABS.some((tab) => tab.id === saved)) return saved as TabId
  } catch {
    /* a sessão do navegador pode estar bloqueada */
  }
  return 'painel'
}

export function storeTab(tab: TabId) {
  try {
    sessionStorage.setItem(TAB_KEY, tab)
  } catch {
    /* ignora falha ao guardar a aba */
  }
}

interface AppTabsProps {
  tab: TabId
  onChange: (tab: TabId) => void
  badges: Partial<Record<TabId, boolean>>
}

export function AppTabs({ tab, onChange, badges }: AppTabsProps) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 backdrop-blur md:sticky md:top-0 md:bottom-auto md:border-t-0 md:border-b md:bg-paper/95"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Seções"
    >
      <div className="mx-auto grid max-w-6xl grid-cols-5 md:flex md:px-6" role="tablist">
        {TABS.map((item) => {
          const selected = tab === item.id
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`aba-${item.id}`}
              aria-selected={selected}
              aria-controls={`secao-${item.id}`}
              onClick={() => onChange(item.id)}
              className={`relative border-t-2 px-1 py-3 text-[11px] leading-tight font-semibold md:border-t-0 md:border-b-2 md:px-3 md:text-sm ${
                selected ? 'border-teal text-teal' : 'border-transparent text-muted'
              }`}
            >
              <span className="md:hidden">{item.short}</span>
              <span className="hidden md:inline">{item.label}</span>
              {badges[item.id] && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-alert" aria-hidden="true" />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
