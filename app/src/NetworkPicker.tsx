// Selector de red — principios de Norman:
//  visibilidad: chip siempre visible junto al total que filtra
//  significante: borde + chevron = "esto se toca"
//  mapping: el chip está pegado al número que cambia
//  reconocimiento: cada red con su punto de color Y su balance al momento de decidir
//  feedback: selección instantánea (balances ya cacheados), check en la activa
//  restricción: sólo las 3 redes soportadas + "todas"; tap afuera cierra
import { useState } from 'react'
import { CHAINS, CHAIN_IDS, type ChainId } from './chain/registry'
import { useNetwork, type NetSel } from './network'
import { fmtArgt } from './chain/format'

export const NET_DOT: Record<ChainId, string> = {
  42161: '#2D9CDB', // Arbitrum
  8453: '#0052FF',  // Base
  137: '#8247E5',   // Polygon
}

function Dot({ sel }: { sel: NetSel }) {
  if (sel === 0) {
    return (
      <span className="net-dots">
        {CHAIN_IDS.map((id) => <i key={id} style={{ background: NET_DOT[id] }} />)}
      </span>
    )
  }
  return <span className="net-dots"><i style={{ background: NET_DOT[sel] }} /></span>
}

export default function NetworkPicker({ balances }: { balances?: Record<ChainId, bigint> }) {
  const { sel, setSel } = useNetwork()
  const [open, setOpen] = useState(false)
  const total = balances ? CHAIN_IDS.reduce((a, id) => a + balances[id], 0n) : 0n

  function pick(n: NetSel) { setSel(n); setOpen(false) }

  return (
    <>
      <button className="net-chip" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <Dot sel={sel} />
        {sel === 0 ? 'Todas las redes' : CHAINS[sel].name}
        <span className="chev-down">▾</span>
      </button>

      {open && (
        <div className="sheet-overlay" onClick={() => setOpen(false)}>
          <div className="sheet" role="dialog" aria-label="Elegir red" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <h3>Red</h3>
            <button className="sheet-row" onClick={() => pick(0)}>
              <Dot sel={0} />
              <span className="nm">Todas las redes</span>
              <span className="bal">${fmtArgt(total)}</span>
              <span className="check">{sel === 0 ? '✓' : ''}</span>
            </button>
            {CHAIN_IDS.map((id) => (
              <button className="sheet-row" key={id} onClick={() => pick(id)}>
                <Dot sel={id} />
                <span className="nm">{CHAINS[id].name}</span>
                <span className="bal">${fmtArgt(balances?.[id] ?? 0n)}</span>
                <span className="check">{sel === id ? '✓' : ''}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
