import { useEffect, useRef, useState } from 'react'
import { coerceMoney, formatNumber, parseBRL } from '../lib/money'

interface CurrencyFieldProps {
  id: string
  label: string
  value: number
  onChange: (value: number) => void
  labelVisibility?: 'always' | 'mobile' | 'hidden'
}

export function CurrencyField({ id, label, value, onChange, labelVisibility = 'always' }: CurrencyFieldProps) {
  const [text, setText] = useState(() => formatNumber(value))
  const textRef = useRef(text)
  const focusedRef = useRef(false)
  const lastEmittedRef = useRef(coerceMoney(value))

  useEffect(() => {
    const next = coerceMoney(value)
    // Enquanto digita, ignore eco do próprio onChange. Aceite reset externo (ex.: limpar após lançar).
    if (focusedRef.current && next === lastEmittedRef.current) return
    const formatted = formatNumber(next)
    textRef.current = formatted
    lastEmittedRef.current = next
    setText(formatted)
  }, [value])

  function commit(raw: string) {
    const parsed = parseBRL(raw)
    lastEmittedRef.current = parsed
    onChange(parsed)
    return parsed
  }

  return (
    <label className="block" htmlFor={id}>
      <span
        className={`text-xs font-semibold tracking-wide text-muted uppercase ${
          labelVisibility === 'hidden' ? 'sr-only' : labelVisibility === 'mobile' ? 'mb-1 block md:sr-only' : 'mb-1 block'
        }`}
      >
        {label}
      </span>
      <span className="flex items-center rounded-2xl bg-white ring-1 ring-line focus-within:ring-2 focus-within:ring-teal">
        <span className="pl-3 text-sm font-semibold text-muted">R$</span>
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          className="w-full min-w-0 bg-transparent px-2 py-2.5 text-right text-base font-semibold tabular-nums outline-none"
          value={text}
          onFocus={(event) => {
            focusedRef.current = true
            event.currentTarget.select()
          }}
          onChange={(event) => {
            textRef.current = event.target.value
            setText(event.target.value)
            commit(event.target.value)
          }}
          onBlur={() => {
            focusedRef.current = false
            const parsed = parseBRL(textRef.current)
            const formatted = formatNumber(parsed)
            textRef.current = formatted
            setText(formatted)
            // Evita reaplicar o valor antigo depois que o formulário já zerou o campo.
            if (parsed !== lastEmittedRef.current) {
              lastEmittedRef.current = parsed
              onChange(parsed)
            }
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur()
          }}
        />
      </span>
    </label>
  )
}
