// Selector de red minimalista: todas las opciones visibles (Norman), una línea de texto,
// activa en tinta con subrayado. Un tap = cambio instantáneo, sin modal.
import { CHAINS, CHAIN_IDS } from './chain/registry'
import { useNetwork, type NetSel } from './network'

export default function NetworkPicker() {
  const { sel, setSel } = useNetwork()
  const opts: { v: NetSel; l: string }[] = [
    { v: 0, l: 'Todas' },
    ...CHAIN_IDS.map((id) => ({ v: id as NetSel, l: CHAINS[id].name })),
  ]
  return (
    <div className="net-seg" role="tablist" aria-label="Red">
      {opts.map((o) => (
        <button key={o.v} role="tab" aria-selected={sel === o.v} className={sel === o.v ? 'on' : ''} onClick={() => setSel(o.v)}>
          {o.l}
        </button>
      ))}
    </div>
  )
}
