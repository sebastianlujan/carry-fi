import { useState } from 'react'
import { useWallet } from '../wallet'
import { CHAINS, ARBITRUM_ID, VAULT_ARGT_PRIME, MORPHO, CARRY_LOOP } from '../chain/registry'
import { shortAddr } from '../chain/format'

export default function Menu() {
  const { address, logout, exportKey, mode } = useWallet()
  const [copied, setCopied] = useState(false)

  function copy() {
    if (!address) return
    void navigator.clipboard.writeText(address)
    setCopied(true); setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="screen">
      <div className="title" style={{ marginTop: 14 }}>Menú</div>

      <div className="card dark">
        <h3>Tu dirección (las 3 redes)</h3>
        <div className="mono" style={{ fontSize: 15 }}>{address}</div>
        <div className="actions" style={{ marginTop: 12, paddingTop: 0 }}>
          <button className="btn ghost" style={{ minHeight: 54, color: 'var(--white)', borderColor: 'rgba(255,254,245,.4)' }} onClick={copy}>
            {copied ? 'Copiada ✓' : 'Copiar'}
          </button>
          {exportKey && (
            <button className="btn ghost" style={{ minHeight: 54, color: 'var(--white)', borderColor: 'rgba(255,254,245,.4)' }} onClick={exportKey}>
              Exportar llave
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <h3>Non-custodial, en serio</h3>
        <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.55 }}>
          {mode === 'privy'
            ? 'Tu llave vive en tu dispositivo (Privy embedded, sharding MPC). Carry no tiene servidores con custodia: no hay backend.'
            : 'Modo burner: la llave está en este navegador (localStorage). Exportala y guardala — es LA custodia.'}
          {' '}El vault y el colateral del loop quedan a tu nombre on-chain: podés operar Morpho
          y el vault directo aunque esta app desaparezca.
        </div>
      </div>

      <div className="card">
        <h3>Contratos (Arbitrum)</h3>
        {[
          ['ARGt', CHAINS[ARBITRUM_ID].argt],
          ['Vault ARGt Prime', VAULT_ARGT_PRIME],
          ['Morpho Blue', MORPHO],
          ['Bridge (LZ OFT)', CHAINS[ARBITRUM_ID].oftAdapter],
          ...(CARRY_LOOP ? [['CarryLoop', CARRY_LOOP] as const] : []),
        ].map(([name, addr]) => (
          <a key={addr} className="row" style={{ textDecoration: 'none', color: 'inherit' }}
             href={`${CHAINS[ARBITRUM_ID].explorer}/address/${addr}`} target="_blank" rel="noreferrer">
            <span className="k">{name}</span><span className="v mono">{shortAddr(addr)} ↗</span>
          </a>
        ))}
      </div>

      <div className="actions">
        <button className="btn ghost wide" onClick={logout}>Cerrar sesión</button>
      </div>
    </div>
  )
}
