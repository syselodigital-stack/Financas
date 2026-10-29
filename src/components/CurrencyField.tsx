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

  useEffect(() => {
    if (focusedRef.current) return
    const formatted = formatNumber(coerceMoney(value))
    textRef.current = formatted
    setText(formatted)
  }, [value])

  function commit(raw: string) {
    const parsed = parseBRL(raw)
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
            const parsed = commit(textRef.current)
            focusedRef.current = false
            const formatted = formatNumber(parsed)
            textRef.current = formatted
            setText(formatted)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur()
          }}
        />
      </span>
    </label>
  )
}
