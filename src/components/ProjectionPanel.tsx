import { CurrencyField } from './CurrencyField'
import { formatBRL } from '../lib/money'
import type { ProjectionPoint } from '../lib/types'

interface ProjectionPanelProps {
  opening: number
  points: ProjectionPoint[]
  onOpening: (value: number) => void
  onClear: (month: string) => void
}

export function ProjectionPanel({ opening, points, onOpening, onClear }: ProjectionPanelProps) {
  const closing = points[points.length - 1]
  const width = 720
  const height = 240
  const pad = { left: 44, right: 12, top: 16, bottom: 32 }
  const max = Math.max(opening, ...points.map((point) => point.reserve), 1)
  const innerW = width - pad.left - pad.right
  const innerH = height - pad.top - pad.bottom
  const coords = points.map((point, index) => {
    const x = pad.left + (index / Math.max(points.length - 1, 1)) * innerW
    const y = pad.top + (1 - point.reserve / max) * innerH
    return { ...point, x, y }
  })
  const line = coords.map((point) => `${point.x},${point.y}`).join(' ')
  const area = `${pad.left},${pad.top + innerH} ${line} ${coords[coords.length - 1]?.x ?? pad.left},${pad.top + innerH}`

  return (
    <section className="rounded-3xl bg-card p-5 ring-1 ring-line md:p-6">
      <div className="grid gap-5 lg:grid-cols-[16rem_1fr] lg:items-end">
        <div>
          <h2 className="font-serif text-2xl">Projeção anual do fundo</h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            Cada mês soma apenas o saldo positivo. Meses registrados guardam a sobra confirmada; os demais
            repetem a sobra calculada agora.
          </p>
          <div className="mt-4 max-w-xs">
            <CurrencyField id="reserve-opening" label="Saldo inicial em janeiro" value={opening} onChange={onOpening} />
          </div>
        </div>
        <article className="rounded-3xl bg-teal-deep px-5 py-4 text-paper">
          <p className="text-xs font-bold tracking-[0.16em] text-[#e8c27a] uppercase">Dezembro</p>
          <p className="mt-2 font-serif text-4xl">{formatBRL(closing?.reserve ?? opening)}</p>
          <p className="mt-2 text-sm text-[#d5e3e0]">
            Crescimento de {formatBRL((closing?.reserve ?? opening) - opening)} sobre o saldo inicial.
          </p>
        </article>
      </div>

      <div className="mt-6 overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Crescimento mensal do fundo de reserva">
          <line x1={pad.left} y1={pad.top + innerH} x2={width - pad.right} y2={pad.top + innerH} stroke="#e4d8c4" />
          <line x1={pad.left} y1={pad.top} x2={width - pad.right} y2={pad.top} stroke="#efe6d6" />
          <text x={pad.left - 8} y={pad.top + 4} textAnchor="end" fontSize="11" fill="#5f584e">
            {formatAxis(max)}
          </text>
          <text x={pad.left - 8} y={pad.top + innerH} textAnchor="end" fontSize="11" fill="#5f584e">
            0
          </text>
          <polygon points={area} fill="#114743" opacity="0.12" />
          <polyline points={line} fill="none" stroke="#114743" strokeWidth="3" />
          {coords.map((point) => (
            <g key={point.month}>
              <circle
                cx={point.x}
                cy={point.y}
                r={point.kind === 'registrado' ? 5 : 4}
                fill={point.kind === 'registrado' ? '#c2882d' : '#fffdf8'}
                stroke="#114743"
                strokeWidth="2"
              >
                <title>
                  {point.label}: fundo em {formatBRL(point.reserve)}, sobra {formatBRL(point.sobra)} ({point.kind})
                </title>
              </circle>
              <text x={point.x} y={height - 8} textAnchor="middle" fontSize="11" fill="#5f584e">
                {point.shortLabel}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs tracking-wide text-muted uppercase">
              <th className="py-2 font-semibold">Mês</th>
              <th className="py-2 font-semibold">Sobra aplicada</th>
              <th className="py-2 font-semibold">Saldo do fundo</th>
              <th className="py-2 font-semibold">Origem</th>
              <th className="py-2 font-semibold">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {points.map((point) => (
              <tr key={point.month} className="border-b border-[#f0e7d8]">
                <td className="py-2.5">{point.label}</td>
                <td className="py-2.5 font-semibold tabular-nums">{formatBRL(point.sobra)}</td>
                <td className="py-2.5 tabular-nums">{formatBRL(point.reserve)}</td>
                <td className="py-2.5">
                  <span className={point.kind === 'registrado' ? 'font-semibold text-gold' : 'text-muted'}>
                    {point.kind === 'registrado' ? 'Registrado' : 'Projetado'}
                  </span>
                </td>
                <td className="py-2.5 text-right">
                  {point.kind === 'registrado' && (
                    <button
                      type="button"
                      className="text-sm font-semibold text-teal underline-offset-2 hover:underline"
                      onClick={() => onClear(point.month)}
                    >
                      Desfazer
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function formatAxis(value: number): string {
  if (value >= 1000) {
    return `${Math.round(value / 1000)} mil`
  }
  return String(Math.round(value))
}
