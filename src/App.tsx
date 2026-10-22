import { useEffect, useMemo, useRef, useState } from 'react'
import { AllocationBoard } from './components/AllocationBoard'
import { AppTabs, readTab, storeTab, type TabId } from './components/AppTabs'
import { DailyLedger } from './components/DailyLedger'
import { IncomePanel } from './components/IncomePanel'
import { PanelHome } from './components/PanelHome'
import { ProjectionPanel } from './components/ProjectionPanel'
import { SyncPanel } from './components/SyncPanel'
import { defaultState, isPristineState, keepDrafts, sameState } from './lib/defaults'
import { allocate, projectYear, upsertClosing } from './lib/engine'
import { daysInMonth, formatBRL, isDateInMonth, monthLabel, monthsOfYear, yearOf } from './lib/money'
import {
  createHouseholdClient,
  explainSyncError,
  loadLocalState,
  loadSupabaseConfig,
  pullRemoteState,
  pushRemoteState,
  saveLocalState,
  saveSupabaseConfig,
  watchHousehold,
} from './lib/persist'
import type { AppState, SupabaseConfig } from './lib/types'

export default function App() {
  const [state, setState] = useState<AppState>(() => loadLocalState())
  const [ready, setReady] = useState(false)
  const [config, setConfig] = useState<SupabaseConfig | null>(() => loadSupabaseConfig())
  const [syncNote, setSyncNote] = useState('Salvo neste navegador')
  const applyingRemote = useRef(false)
  const localDirty = useRef(false)
  const pushGen = useRef(0)
  const [notice, setNotice] = useState('')
  const [tab, setTab] = useState<TabId>(() => readTab())

  const result = useMemo(() => allocate(state), [state])
  const projection = useMemo(
    () => projectYear(state.activeMonth, state.reserveOpening, result.sobra, state.closings),
    [state.activeMonth, state.reserveOpening, state.closings, result.sobra],
  )
  const registered = state.closings.some((closing) => closing.month === state.activeMonth)
  const yearMonths = monthsOfYear(yearOf(state.activeMonth))
  const monthEntries = state.dailyExpenses.filter((entry) => entry.date.startsWith(state.activeMonth))
  const filledDays = new Set(monthEntries.map((entry) => entry.date)).size
  const dailyTotal = monthEntries.reduce((sum, entry) => sum + entry.amount, 0)
  const monthPayments = Object.fromEntries(
    state.settlements
      .filter((item) => item.month === state.activeMonth)
      .map((item) => [item.expenseId, { paid: item.paid, installments: item.installments }]),
  )
  const payableLines = result.lines.filter((line) => !line.locked && line.due > 0)
  const paidCount = payableLines.filter((line) => monthPayments[line.expense.id]?.paid).length
  const installmentCount = payableLines.reduce(
    (sum, line) => sum + (monthPayments[line.expense.id]?.installments ?? 0),
    0,
  )
  const monthDates = Object.fromEntries(
    (state.receipts ?? [])
      .filter((item) => item.month === state.activeMonth)
      .map((item) => [item.incomeId, item.date]),
  )
  const billDates = Object.fromEntries(
    (state.expenseDues ?? [])
      .filter((item) => item.month === state.activeMonth)
      .map((item) => [item.expenseId, item.date]),
  )
  const calendarIncomes = state.incomes
    .filter((income) => monthDates[income.id])
    .map((income) => ({
      id: income.id,
      name: income.holder || income.label,
      amount: income.amount,
      date: monthDates[income.id],
    }))
  const calendarBills = result.lines
    .filter((line) => !line.locked && billDates[line.expense.id])
    .map((line) => ({
      id: line.expense.id,
      name: line.expense.name,
      amount: line.expense.amount,
      date: billDates[line.expense.id],
    }))
  const unplaced = [
    ...state.incomes
      .filter((income) => income.amount > 0 && !monthDates[income.id])
      .map((income) => income.holder || income.label),
    ...result.lines
      .filter((line) => !line.locked && line.expense.amount > 0 && !billDates[line.expense.id])
      .map((line) => line.expense.name),
  ]

  function openTab(next: TabId) {
    setTab(next)
    storeTab(next)
    window.scrollTo({ top: 0 })
  }

  useEffect(() => {
    let cancel = false
    const current = loadSupabaseConfig()
    if (!current) {
      setReady(true)
      setSyncNote('Salvo neste navegador')
      return
    }

    const client = createHouseholdClient(current)
    const local = loadLocalState()
    pullRemoteState(client)
      .then(async (remote) => {
        if (cancel) return
        if (remote && !isPristineState(remote)) {
          applyingRemote.current = true
          setState(remote)
        } else if (!isPristineState(local)) {
          await pushRemoteState(client, local)
        } else if (remote) {
          applyingRemote.current = true
          setState(remote)
        }
        if (cancel) return
        setSyncNote('Sincronizado. Os outros navegadores veem estes lançamentos.')
        setReady(true)
      })
      .catch((error: unknown) => {
        if (cancel) return
        const text = error instanceof Error ? error.message : 'Falha ao ler o Supabase'
        setSyncNote(explainSyncError(text))
        setReady(true)
      })

    return () => {
      cancel = true
    }
  }, [config])

  useEffect(() => {
    if (!ready) return
    saveLocalState(state)
    if (applyingRemote.current) {
      applyingRemote.current = false
      localDirty.current = false
      return
    }
    const current = loadSupabaseConfig()
    if (!current || isPristineState(state)) {
      localDirty.current = false
      return
    }

    const client = createHouseholdClient(current)
    const generation = ++pushGen.current
    localDirty.current = true
    const timer = window.setTimeout(() => {
      pushRemoteState(client, state)
        .then(() => setSyncNote('Sincronizado. Os outros navegadores veem estes lançamentos.'))
        .catch((error: unknown) => {
          const text = error instanceof Error ? error.message : 'Falha ao salvar no Supabase'
          setSyncNote(explainSyncError(text))
        })
        .finally(() => {
          if (pushGen.current === generation) localDirty.current = false
        })
    }, 700)

    return () => window.clearTimeout(timer)
  }, [state, ready, config])

  useEffect(() => {
    if (!ready) return
    const current = loadSupabaseConfig()
    if (!current) return

    const client = createHouseholdClient(current)
    let cancel = false
    const refresh = () => {
      if (localDirty.current) return
      pullRemoteState(client)
        .then((remote) => {
          if (cancel || !remote) return
          setState((currentState) => {
            const next = keepDrafts(currentState, remote)
            if (sameState(currentState, next)) return currentState
            applyingRemote.current = true
            return next
          })
        })
        .catch(() => {
          /* a próxima leitura tenta de novo */
        })
    }

    const timer = window.setInterval(refresh, 2000)
    const onFocus = () => refresh()
    window.addEventListener('focus', onFocus)
    const stopWatch = watchHousehold(client, refresh)

    return () => {
      cancel = true
      window.clearInterval(timer)
      window.removeEventListener('focus', onFocus)
      stopWatch()
    }
  }, [ready, config])

  function registerMonth() {
    const snapshot = allocate(state)
    setState(upsertClosing(state, snapshot))
    setNotice(
      `${monthLabel(state.activeMonth)} registrado. A sobra de ${formatBRL(snapshot.sobra)} entrou na projeção do fundo.`,
    )
  }

  return (
    <div className="min-h-screen">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-10 focus:rounded-full focus:bg-white focus:px-3 focus:py-2"
      >
        Ir para o conteúdo
      </a>

      <header className="relative overflow-hidden bg-teal-deep text-paper">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(232,194,122,0.2),transparent_36%)]" />
        <div className="relative mx-auto flex max-w-6xl flex-col gap-5 px-4 py-5 md:px-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold tracking-[0.22em] text-[#e8c27a] uppercase">Reorganização familiar</p>
            <h1 className="mt-2 max-w-xl font-serif text-3xl leading-none md:text-5xl">
              O essencial primeiro. A sobra vira reserva.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#d7e4e1]">
              Receita, diário e contas ficam em abas. O lançamento do dia entra em alimentação, combustível, contas ou outros.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold tracking-wide text-[#d7e4e1] uppercase">Competência</span>
              <select
                value={state.activeMonth}
                className="rounded-2xl bg-white px-3 py-2.5 text-ink ring-1 ring-transparent"
                onChange={(event) => setState((current) => ({ ...current, activeMonth: event.target.value }))}
              >
                {yearMonths.map((month) => (
                  <option key={month} value={month}>
                    {monthLabel(month)}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={registerMonth}
              className="rounded-full bg-[#e8c27a] px-4 py-3 text-sm font-bold text-teal-deep"
            >
              {registered ? 'Atualizar registro' : 'Registrar entrada'} de {formatBRL(result.totalIncome)}
            </button>
          </div>
        </div>
      </header>

      <AppTabs tab={tab} onChange={openTab} badges={{ diario: result.sombra > 0 }} />

      <main id="conteudo" className="mx-auto max-w-6xl px-4 py-4 pb-24 md:px-6 md:py-6 md:pb-10">
        {notice && (
          <p className="mb-4 rounded-2xl bg-sage-soft px-4 py-3 text-sm font-medium text-sage" role="status">
            {notice}
          </p>
        )}

        <div role="tabpanel" id={`secao-${tab}`} aria-labelledby={`aba-${tab}`}>
          {tab === 'painel' && (
            <PanelHome
              result={result}
              incomes={state.incomes}
              dates={monthDates}
              filledDays={filledDays}
              monthDays={daysInMonth(state.activeMonth)}
              dailyTotal={dailyTotal}
              registered={registered}
              paidCount={paidCount}
              payableCount={payableLines.length}
              installmentCount={installmentCount}
              onOpen={openTab}
            />
          )}

          {tab === 'caixa' && (
            <div>
              <IncomePanel
                incomes={state.incomes}
                total={result.totalIncome}
                month={state.activeMonth}
                dates={monthDates}
                onAmount={(id, amount) =>
                  setState((current) => ({
                    ...current,
                    incomes: current.incomes.map((income) => (income.id === id ? { ...income, amount } : income)),
                  }))
                }
                onHolder={(id, holder) =>
                  setState((current) => ({
                    ...current,
                    incomes: current.incomes.map((income) => (income.id === id ? { ...income, holder } : income)),
                  }))
                }
                onDate={(id, date) =>
                  setState((current) => {
                    const receipts = current.receipts ?? []
                    const rest = receipts.filter((item) => item.month !== current.activeMonth || item.incomeId !== id)
                    if (!date || !isDateInMonth(date, current.activeMonth)) {
                      return { ...current, receipts: rest }
                    }
                    return {
                      ...current,
                      receipts: [...rest, { month: current.activeMonth, incomeId: id, date }],
                    }
                  })
                }
                onAdd={() =>
                  setState((current) => ({
                    ...current,
                    incomes: [
                      ...current.incomes,
                      {
                        id: crypto.randomUUID(),
                        label: 'Outra entrada',
                        holder: '',
                        amount: 0,
                        custom: true,
                      },
                    ],
                  }))
                }
                onRemove={(id) =>
                  setState((current) => ({
                    ...current,
                    incomes: current.incomes.filter((income) => income.id !== id || !income.custom),
                    receipts: (current.receipts ?? []).filter((item) => item.incomeId !== id),
                  }))
                }
              />
            </div>
          )}

          {tab === 'diario' && (
            <div className="space-y-4">
              <DailyLedger
                month={state.activeMonth}
                entries={state.dailyExpenses}
                incomes={calendarIncomes}
                bills={calendarBills}
                unplaced={unplaced}
                onAdd={(entry) =>
                  setState((current) => ({
                    ...current,
                    dailyExpenses: [...current.dailyExpenses, { ...entry, id: crypto.randomUUID() }],
                  }))
                }
                onRemove={(id) =>
                  setState((current) => ({
                    ...current,
                    dailyExpenses: current.dailyExpenses.filter((item) => item.id !== id),
                  }))
                }
              />
              <AllocationBoard
                result={result}
                month={state.activeMonth}
                monthLabel={monthLabel(state.activeMonth)}
                payments={monthPayments}
                dueDates={billDates}
                entries={state.dailyExpenses}
                onAmount={(id, amount) =>
                  setState((current) => ({
                    ...current,
                    expenses: current.expenses.map((expense) => (expense.id === id ? { ...expense, amount } : expense)),
                  }))
                }
                onName={(id, name) =>
                  setState((current) => ({
                    ...current,
                    expenses: current.expenses.map((expense) =>
                      expense.id === id ? { ...expense, name: name.slice(0, 80) } : expense,
                    ),
                  }))
                }
                onAdd={() => {
                  const id = crypto.randomUUID()
                  setState((current) => ({
                    ...current,
                    expenses: [
                      ...current.expenses,
                      { id, name: '', detail: '', amount: 0, priority: 3, custom: true, editable: true },
                    ],
                  }))
                  queueMicrotask(() => {
                    const fields = document.querySelectorAll<HTMLElement>(`[data-expense-name="${id}"]`)
                    const visible = [...fields].find((field) => field.getClientRects().length > 0)
                    visible?.focus()
                  })
                }}
                onRemove={(id) => {
                  const expense = state.expenses.find((item) => item.id === id)
                  if (!expense) return
                  const label = expense.name.trim() || 'esta conta'
                  if (!window.confirm(`Excluir ${label} do mapa? Ela sai de todos os meses.`)) return
                  setState((current) => ({
                    ...current,
                    expenses: current.expenses.filter((item) => item.id !== id),
                    removedExpenseIds: expense.custom
                      ? (current.removedExpenseIds ?? [])
                      : [...new Set([...(current.removedExpenseIds ?? []), id])],
                    settlements: current.settlements.filter((item) => item.expenseId !== id),
                    expenseDues: (current.expenseDues ?? []).filter((item) => item.expenseId !== id),
                  }))
                }}
                onPayment={(id, patch) =>
                  setState((current) => {
                    const existing = current.settlements.find(
                      (item) => item.month === current.activeMonth && item.expenseId === id,
                    )
                    const next = {
                      month: current.activeMonth,
                      expenseId: id,
                      paid: patch.paid ?? existing?.paid ?? false,
                      installments: patch.installments ?? existing?.installments ?? 0,
                    }
                    const rest = current.settlements.filter(
                      (item) => item.month !== current.activeMonth || item.expenseId !== id,
                    )
                    return {
                      ...current,
                      settlements: !next.paid && next.installments <= 0 ? rest : [...rest, next],
                    }
                  })
                }
                onDueDate={(id, date) =>
                  setState((current) => {
                    const dues = current.expenseDues ?? []
                    const rest = dues.filter((item) => item.month !== current.activeMonth || item.expenseId !== id)
                    if (!date || !isDateInMonth(date, current.activeMonth)) {
                      return { ...current, expenseDues: rest }
                    }
                    return {
                      ...current,
                      expenseDues: [...rest, { month: current.activeMonth, expenseId: id, date }],
                    }
                  })
                }
              />
            </div>
          )}

          {tab === 'fundo' && (
            <ProjectionPanel
              opening={state.reserveOpening}
              points={projection}
              onOpening={(reserveOpening) => setState((current) => ({ ...current, reserveOpening }))}
              onClear={(month) =>
                setState((current) => ({
                  ...current,
                  closings: current.closings.filter((closing) => closing.month !== month),
                }))
              }
            />
          )}

          {tab === 'ajustes' && (
            <div className="space-y-4">
              <SyncPanel
                config={config}
                note={syncNote}
                onSave={(next) => {
                  saveSupabaseConfig(next)
                  setReady(false)
                  setConfig(next)
                }}
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-sm font-semibold text-muted underline-offset-2 hover:underline"
                  onClick={() => {
                    if (window.confirm('Restaurar rendas, datas, despesas, pagamentos e diário para o mapa inicial?')) {
                      const fresh = defaultState()
                      setState(fresh)
                      setNotice('Mapa inicial restaurado.')
                    }
                  }}
                >
                  Restaurar mapa inicial
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
