import { useState } from 'react'
import { useWallet } from '../wallet'
import { CHAINS, CHAIN_IDS } from '../chain/registry'
import { IconCopy } from '../Icons'

export default function Receive({ back }: { back: () => void }) {
  const { address } = useWallet()
  const [copied, setCopied] = useState(false)

  function copy() {
    if (!address) return
    void navigator.clipboard.writeText(address)
    setCopied(true); setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div className="screen">
      <button className="back" onClick={back}>← Wallet</button>
      <div className="title">Recibir ARGt</div>
      <div className="sub" style={{ marginTop: 6 }}>
        Tu dirección es la misma en {CHAIN_IDS.map((id) => CHAINS[id].name).join(', ')}.
      </div>

      <div className="card dark" style={{ marginTop: 18 }}>
        <h3>Tu dirección</h3>
        <div className="mono" style={{ fontSize: 17, lineHeight: 1.6, wordBreak: 'break-all', fontWeight: 700 }}>
          {address}
        </div>
        <button
          className="pos-cta"
          style={{ justifyContent: 'center', gap: 9 }}
          onClick={copy}
        >
          <IconCopy /> {copied ? 'Copiada ✓' : 'Copiar dirección'}
        </button>
      </div>

      <div className="banner">
        Compartila con quien te manda ARGt (o cualquier token EVM). Verificá siempre los
        primeros y últimos caracteres: <b className="mono">{address ? `${address.slice(0, 6)}…${address.slice(-4)}` : ''}</b>
      </div>

      <div className="actions">
        <button className="btn primary wide" onClick={copy}>{copied ? 'Copiada ✓' : 'Copiar'} </button>
      </div>
    </div>
  )
}
