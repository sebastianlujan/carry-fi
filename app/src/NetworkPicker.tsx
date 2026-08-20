// Selector de red en el header (patrón estándar de wallets). Pill compacta con la red
// actual → menú anclado. Norman: visible, mapping directo (arriba, contexto global),
// reconocimiento (todas las opciones + check), feedback inmediato, tap-afuera cierra.
import { useEffect, useRef, useState } from 'react'
import { CHAINS, CHAIN_IDS } from './chain/registry'
import { useNetwork, type NetSel } from './network'

export default function NetworkPicker() {
  const { sel, setSel } = useNetwork()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  const opts: { v: NetSel; l: string }[] = [
    { v: 0, l: 'Todas' },
    ...CHAIN_IDS.map((id) => ({ v: id as NetSel, l: CHAINS[id].name })),
  ]
  const label = sel === 0 ? 'Todas' : CHAINS[sel].name

  return (
    <div className="net-pop" ref={ref}>
      <button className="net-pill" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open}>
        <i className="dot" />{label}<span className="cv">▾</span>
      </button>
      {open && (
        <div className="net-menu" role="menu">
          {opts.map((o) => (
            <button key={o.v} role="menuitemradio" aria-checked={sel === o.v}
              className={sel === o.v ? 'on' : ''} onClick={() => { setSel(o.v); setOpen(false) }}>
              <i className="dot" />{o.l}<span className="ck">{sel === o.v ? '✓' : ''}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
