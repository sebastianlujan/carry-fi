import { useState } from 'react'
import { useWallet } from '../wallet'
import { CHAINS, ARBITRUM_ID, VAULT_ARGT_PRIME, MORPHO, CARRY_LOOP } from '../chain/registry'
import { shortAddr } from '../chain/format'
import { IconShield, IconKey, IconCode, IconCopy, IconLogout, Chevron, IconWallet, IconChart } from '../Icons'
import type { Screen } from '../App'

export default function Menu({ go }: { go: (s: Screen) => void }) {
  const { address, logout, exportKey, mode } = useWallet()
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState<'' | 'how' | 'tech'>('')

  function copy() {
    if (!address) return
    void navigator.clipboard.writeText(address)
    setCopied(true); setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="screen">
      <div className="greet"><h1>Más</h1></div>

      <div className="trust">
        <div className="icircle"><IconShield /></div>
        <div style={{ flex: 1 }}>
          <b>Tus fondos son tuyos</b>
          <p>CarryFi es non-custodial. Vos mantenés el control de tu wallet y de tus claves.</p>
          <button className="how" onClick={() => setOpen(open === 'how' ? '' : 'how')}>
            <span>¿Cómo funciona?</span> <Chevron w={16} />
          </button>
          {open === 'how' && (
            <p style={{ marginTop: 10 }}>
              {mode === 'privy'
                ? 'Tu llave vive en tu dispositivo (Privy embedded, sharding MPC). No hay backend: la app habla directo con la chain.'
                : 'Modo burner: la llave está en este navegador. Exportala desde "Seguridad y respaldo" — es LA custodia.'}
              {' '}El vault y el colateral del loop quedan a tu nombre on-chain: podés operar
              Morpho y el vault directo aunque esta app desaparezca.
            </p>
          )}
        </div>
      </div>

      <div className="wcard">
        <div className="icircle"><IconWallet /></div>
        <div className="body">
          <b>Tu wallet</b>
          <span className="mono" style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>
            {address ? shortAddr(address) : '—'}
          </span>
        </div>
        <button className="chip" onClick={copy}><IconCopy /> {copied ? 'Copiada ✓' : 'Copiar'}</button>
      </div>

      <button className="wcard" onClick={() => go('activity')}>
        <div className="icircle"><IconChart /></div>
        <div className="body">
          <b>Actividad</b>
          <span>Tus movimientos de ARGt on-chain.</span>
        </div>
        <span className="chev"><Chevron /></span>
      </button>

      <button className="wcard" onClick={() => { if (exportKey) exportKey() }}>
        <div className="icircle"><IconKey /></div>
        <div className="body">
          <b>Seguridad y respaldo</b>
          <span>Opciones para respaldar tu cuenta y exportar tu clave privada.</span>
        </div>
        <span className="chev"><Chevron /></span>
      </button>

      <button className="wcard" onClick={() => setOpen(open === 'tech' ? '' : 'tech')}>
        <div className="icircle"><IconCode /></div>
        <div className="body">
          <b>Información técnica</b>
          <span>Contratos, vaults y protocolos utilizados por CarryFi.</span>
        </div>
        <span className="chev"><Chevron /></span>
      </button>

      {open === 'tech' && (
        <div className="card" style={{ background: '#fff' }}>
          {[
            ['ARGt (Twin)', CHAINS[ARBITRUM_ID].argt],
            ['Vault ARGt Prime', VAULT_ARGT_PRIME],
            ['Morpho Blue', MORPHO],
            ['Bridge (LayerZero OFT)', CHAINS[ARBITRUM_ID].oftAdapter],
            ...(CARRY_LOOP ? [['CarryLoop', CARRY_LOOP] as const] : []),
          ].map(([name, addr]) => (
            <a key={addr} className="row" style={{ textDecoration: 'none', color: 'inherit' }}
               href={`${CHAINS[ARBITRUM_ID].explorer}/address/${addr}`} target="_blank" rel="noreferrer">
              <span className="k">{name}</span><span className="v mono">{shortAddr(addr)} ↗</span>
            </a>
          ))}
        </div>
      )}

      <button className="logout-btn" onClick={logout}><IconLogout /> Cerrar sesión</button>
      <div style={{ height: 8 }} />
    </div>
  )
}
