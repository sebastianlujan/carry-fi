// La gráfica del carry: tu historia hasta hoy + tres futuros posibles, computados
// con el APY LIVE del market (nunca hardcodeado): peso estable, deval 15%, deval 25%.
// valor_usd(t) = P0 · (1+apy)^t / (1+deval)^t  — SVG puro, sin libs.
import { useMemo, useState } from 'react'
import type { Snap } from './chain/history'

const RANGES = [
  { label: '3M', years: 0.25 },
  { label: '6M', years: 0.5 },
  { label: '1A', years: 1 },
  { label: '2A', years: 2 },
] as const

const W = 360, H = 168, PAD_T = 10, PAD_B = 22
const SPLIT = 0.36 // fracción del ancho para la historia

function curve(p0: number, apy: number, deval: number, years: number, steps = 24): number[] {
  const out: number[] = []
  for (let i = 0; i <= steps; i++) {
    const t = (years * i) / steps
    out.push(p0 * Math.pow(1 + apy, t) / Math.pow(1 + deval, t))
  }
  return out
}

export default function ProjectionChart({ patrimonioUsd, carryApy, history }: {
  patrimonioUsd: number
  carryApy: number
  history: Snap[]
}) {
  const [ri, setRi] = useState(2) // 1A default
  const range = RANGES[ri]
  const p0 = patrimonioUsd > 0 ? patrimonioUsd : 1000 // sin fondos: forma de la curva igual visible

  const { paths } = useMemo(() => {
    const estable = curve(p0, carryApy, 0, range.years)
    const d15 = curve(p0, carryApy, 0.15, range.years)
    const d25 = curve(p0, carryApy, 0.25, range.years)
    const hist = history.length >= 2 ? history.map((s) => s.v) : [p0 * 0.985, p0]

    const all = [...estable, ...d15, ...d25, ...hist]
    const lo = Math.min(...all), hi = Math.max(...all)
    const span = hi - lo || 1
    const y = (v: number) => PAD_T + (1 - (v - lo) / span) * (H - PAD_T - PAD_B)

    const splitX = W * SPLIT
    const histPath = hist
      .map((v, i) => `${i === 0 ? 'M' : 'L'}${(i / (hist.length - 1)) * splitX},${y(v)}`)
      .join('')
    const proj = (vals: number[]) => vals
      .map((v, i) => `${i === 0 ? 'M' : 'L'}${splitX + (i / (vals.length - 1)) * (W - splitX)},${y(v)}`)
      .join('')

    return {
      paths: { histPath, estable: proj(estable), d15: proj(d15), d25: proj(d25), splitX, dotY: y(p0) },
    }
  }, [p0, carryApy, range.years, history])

  return (
    <div className="chart-card">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Proyección del patrimonio">
        {/* zona historia sombreada + divisor "hoy" */}
        <rect x="0" y="0" width={paths.splitX} height={H - PAD_B} fill="rgba(255,254,245,.045)" />
        <line x1={paths.splitX} y1={PAD_T - 4} x2={paths.splitX} y2={H - PAD_B} stroke="rgba(255,254,245,.25)" strokeWidth="1" />
        {/* proyecciones */}
        <path d={paths.d25} fill="none" stroke="#ff8080" strokeWidth="1.8" strokeDasharray="2 4" strokeLinecap="round" />
        <path d={paths.d15} fill="none" stroke="rgba(255,254,245,.65)" strokeWidth="1.8" strokeDasharray="7 5" strokeLinecap="round" />
        <path d={paths.estable} fill="none" stroke="#fffef5" strokeWidth="2.2" strokeLinecap="round" />
        {/* historia en lima */}
        <path d={paths.histPath} fill="none" stroke="#D7F73E" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={paths.splitX} cy={paths.dotY} r="4.5" fill="#D7F73E" stroke="#141414" strokeWidth="1.5" />
        {/* eje */}
        <text x="4" y={H - 7} fill="rgba(255,254,245,.45)" fontSize="9" fontFamily="Archivo">historia</text>
        <text x={paths.splitX} y={H - 7} fill="rgba(255,254,245,.7)" fontSize="9" fontFamily="Archivo" textAnchor="middle">hoy</text>
        <text x={W - 4} y={H - 7} fill="rgba(255,254,245,.45)" fontSize="9" fontFamily="Archivo" textAnchor="end">+{range.label}</text>
      </svg>

      <div className="range-picker">
        {RANGES.map((r, i) => (
          <button key={r.label} className={i === ri ? 'on' : ''} onClick={() => setRi(i)}>{r.label}</button>
        ))}
      </div>

      <div className="legend">
        <span><i className="sw lime" />historia</span>
        <span><i className="sw white" />peso estable <b>{(carryApy * 100).toFixed(1)}%</b></span>
        <span><i className="sw dash" />deval 15%</span>
        <span><i className="sw dot" />deval 25%</span>
      </div>
    </div>
  )
}
