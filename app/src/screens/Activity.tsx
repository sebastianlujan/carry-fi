import { useWallet } from '../wallet'
import { useActivity } from '../hooks'
import { relTime, type Tx } from '../chain/activity'
import { CHAINS } from '../chain/registry'
import { fmtArgt, shortAddr } from '../chain/format'

const LABEL: Record<Tx['kind'], string> = {
  send: 'Enviaste', receive: 'Recibiste', 'vault-in': 'Depósito al vault', 'vault-out': 'Retiro del vault',
}

export default function Activity({ back }: { back: () => void }) {
  const { address } = useWallet()
  const { data, isLoading, isError } = useActivity(address)

  return (
    <div className="screen">
      <button className="back" onClick={back}>← Wallet</button>
      <div className="title">Actividad</div>
      <div className="sub" style={{ marginTop: 6 }}>Transferencias de ARGt on-chain, leídas en vivo.</div>

      {isLoading && <div className="status" style={{ marginTop: 20 }}><span className="spin" /> Leyendo la blockchain…</div>}
      {isError && <div className="banner err">No se pudo leer la actividad. Reintentá en un momento.</div>}
      {data && data.length === 0 && (
        <div className="banner" style={{ marginTop: 18 }}>Todavía no hay movimientos de ARGt en esta dirección.</div>
      )}

      {data && data.length > 0 && (
        <div className="tokens" style={{ marginTop: 14 }}>
          {data.map((t) => (
            <a key={`${t.hash}:${t.logIndex}`} className="act-row"
               href={`${CHAINS[t.chain].explorer}/tx/${t.hash}`} target="_blank" rel="noreferrer">
              <div className={`act-ic ${t.dir}`}>{t.dir === 'in' ? '↘' : '↗'}</div>
              <div className="act-body">
                <b>{LABEL[t.kind]}</b>
                <span>{shortAddr(t.counterparty)} · {CHAINS[t.chain].name} · {relTime(t.ts)}</span>
              </div>
              <div className={`act-amt ${t.dir}`}>{t.dir === 'in' ? '+' : '−'}${fmtArgt(t.value)}</div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
