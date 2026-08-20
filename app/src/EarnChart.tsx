// Gráfica de la pantalla Posición: proyección del rendimiento al ritmo del carry.
// Fondo lima, trazos negros. Línea sólida = con el carry; punteada = capital quieto.
// value(t) = base·(1+apy)^t — honesto: usa el APY LIVE del market.
import { useMemo, useState } from 'react'
import { fromWei } from './chain/format'

const W = 360, H = 158, PAD = 12, PAD_B = 20, PAD_T = 22
const RANGES = [
  { label: '3M', years: 0.25 },
  { label: '6M', years: 0.5 },
  { label: '1A', years: 1 },
] as const

const money = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 })

export default function EarnChart({ baseArgt, carryApy }: { baseArgt: bigint; carryApy: number }) {
  const [ri, setRi] = useState(2)
  const years = RANGES[ri].years
  const baseNum = fromWei(baseArgt)
  const base = baseNum > 0 ? baseNum : 1000 // sin posición: mostramos la forma sobre $1.000
  const isRef = baseNum <= 0

  const { line, flatY, endY, endVal, splitX } = useMemo(() => {
    const steps = 32
    const vals = Array.from({ length: steps + 1 }, (_, i) => base * Math.pow(1 + carryApy, (years * i) / steps))
    const hi = vals[vals.length - 1], lo = base
    const span = hi - lo || 1
    const y = (v: number) => PAD_T + (1 - (v - lo) / span) * (H - PAD_T - PAD_B)
    const d = vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${PAD + (i / steps) * (W - PAD * 2)},${y(v)}`).join('')
    return { line: d, flatY: y(base), endY: y(hi), endVal: hi, splitX: PAD }
  }, [base, carryApy, years])

  return (
    <div className="earn-chart">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Proyección del rendimiento">
        {/* capital quieto: línea punteada negra */}
        <line x1={PAD} y1={flatY} x2={W - PAD} y2={flatY} stroke="#141414" strokeWidth="1.5" strokeDasharray="2 5" opacity="0.45" />
        {/* con el carry: línea sólida negra */}
        <path d={line} fill="none" stroke="#141414" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={splitX} cy={flatY} r="4" fill="#141414" />
        <circle cx={W - PAD} cy={endY} r="4.5" fill="#141414" />
        <text x={W - PAD} y={endY - 9} fill="#141414" fontSize="12" fontWeight="800" fontFamily="Archivo" textAnchor="end">
          ${money.format(endVal)}
        </text>
        <text x={PAD} y={H - 6} fill="#141414" fontSize="9" fontWeight="700" fontFamily="Archivo" opacity="0.55">hoy</text>
        <text x={W - PAD} y={H - 6} fill="#141414" fontSize="9" fontWeight="700" fontFamily="Archivo" textAnchor="end" opacity="0.55">+{RANGES[ri].label}</text>
      </svg>
      <div className="earn-range">
        {RANGES.map((r, i) => (
          <button key={r.label} className={i === ri ? 'on' : ''} onClick={() => setRi(i)}>{r.label}</button>
        ))}
        <span className="rate">al {(carryApy * 100).toFixed(1)}% del carry</span>
      </div>
      {isRef && <div className="earn-note">Proyección de ejemplo sobre $1.000 — depositá para ver la tuya.</div>}
    </div>
  )
}
