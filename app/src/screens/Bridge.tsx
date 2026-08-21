// Bridge estilo Squid: cards Desde/Hacia con selector de chain, flecha para invertir,
// detalle de ruta (LayerZero + fee + tiempo) por defecto. Lógica: OFT V2, dust a 1e12.
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { Abi } from 'viem'
import { formatEther } from 'viem'
import { useWallet } from '../wallet'
import { useBalances } from '../hooks'
import { CHAINS, CHAIN_IDS, type ChainId, ARBITRUM_ID, BASE_ID } from '../chain/registry'
import { oftAbi } from '../chain/abis'
import { floorToShared, sendParam, quoteBridge } from '../chain/bridge'
import { fmtArgt, parseArgt } from '../chain/format'
import { useNetwork } from '../network'
import { runTx, ensureAllowance, errMsg } from '../tx'

function ChainSelect({ value, onChange, exclude }: { value: ChainId; onChange: (c: ChainId) => void; exclude?: ChainId }) {
  const opts = CHAIN_IDS.filter((id) => id !== exclude)
  return (
    <div className="chain-select">
      <i className="dot" />
      <select value={value} onChange={(e) => onChange(Number(e.target.value) as ChainId)}>
        {opts.map((id) => <option key={id} value={id}>{CHAINS[id].name}</option>)}
      </select>
      <span className="cv">▾</span>
    </div>
  )
}

export default function Bridge({ back }: { back: () => void }) {
  const { address, getSigner } = useWallet()
  const { data: balances, refetch } = useBalances(address)
  const { sel } = useNetwork()
  const [src, setSrc] = useState<ChainId>(sel === 0 ? ARBITRUM_ID : sel)
  const [dst, setDst] = useState<ChainId>(sel === BASE_ID ? ARBITRUM_ID : BASE_ID)
  const [amountStr, setAmountStr] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(''); const [err, setErr] = useState(''); const [done, setDone] = useState('')

  const raw = parseArgt(amountStr)
  const amount = raw !== null ? floorToShared(raw) : null
  const bal = balances?.[src] ?? 0n
  const quotable = amount !== null && amount > 0n && src !== dst && !!address
  const valid = quotable && amount <= bal

  const { data: fee, isFetching: quoting } = useQuery({
    queryKey: ['bridgeFee', src, dst, amount?.toString(), address],
    queryFn: () => quoteBridge(src, dst, address!, amount!),
    enabled: quotable,
    refetchInterval: 20_000,
  })

  function flip() {
    setSrc(dst); setDst(src); setAmountStr('')
  }
  function pickSrc(c: ChainId) { setSrc(c); if (c === dst) setDst(CHAIN_IDS.find((x) => x !== c)!) }
  function pickDst(c: ChainId) { setDst(c); if (c === src) setSrc(CHAIN_IDS.find((x) => x !== c)!) }

  async function go() {
    if (!valid || amount === null || !address || fee === undefined) return
    setBusy(true); setErr(''); setMsg('')
    try {
      const signer = await getSigner(src)
      setMsg('1/2 · Aprobando ARGt al adapter…')
      await ensureAllowance(signer, src, CHAINS[src].argt, address, CHAINS[src].oftAdapter, amount)
      setMsg('2/2 · Enviando por LayerZero…')
      const h = await runTx(signer, {
        address: CHAINS[src].oftAdapter, abi: oftAbi as Abi, functionName: 'send',
        args: [sendParam(dst, address, amount), { nativeFee: fee, lzTokenFee: 0n }, address],
        value: fee,
      })
      setDone(h); setMsg(''); void refetch()
    } catch (e) { setErr(errMsg(e)) } finally { setBusy(false) }
  }

  if (done) {
    return (
      <div className="screen">
        <button className="back" onClick={back}>← Wallet</button>
        <div className="title">En camino ⇄</div>
        <div className="card">
          <div className="row"><span className="k">Monto</span><span className="v">${amount !== null ? fmtArgt(amount) : ''}</span></div>
          <div className="row"><span className="k">Ruta</span><span className="v">{CHAINS[src].name} → {CHAINS[dst].name}</span></div>
        </div>
        <a className="banner" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
           href={`https://layerzeroscan.com/tx/${done}`} target="_blank" rel="noreferrer">
          Seguir en LayerZero Scan ↗ (llega en ~1-3 min)
        </a>
        <div className="actions"><button className="btn primary wide" onClick={back}>Listo</button></div>
      </div>
    )
  }

  const recibis = amount !== null ? amount : 0n

  return (
    <div className="screen">
      <button className="back" onClick={back}>← Volver</button>
      <div className="title">Bridge</div>
      <div className="sub" style={{ marginTop: 4 }}>Mové ARGt entre redes.</div>

      <div className="swap-wrap">
        {/* Desde */}
        <div className="swap-card">
          <div className="swap-head"><span>Enviás</span><ChainSelect value={src} onChange={pickSrc} exclude={dst} /></div>
          <div className="swap-amt">
            <input inputMode="decimal" placeholder="0,00" value={amountStr} onChange={(e) => setAmountStr(e.target.value)} />
            <span className="tk">ARGt</span>
          </div>
          <div className="swap-foot">
            <span>Disponible ${fmtArgt(bal)}</span>
            <button className="max-btn" onClick={() => setAmountStr((Number(floorToShared(bal) / 10n ** 12n) / 1e6).toString().replace('.', ','))}>MAX</button>
          </div>
        </div>

        <button className="swap-flip" onClick={flip} aria-label="Invertir">↓</button>

        {/* Hacia */}
        <div className="swap-card to">
          <div className="swap-head"><span>Recibís</span><ChainSelect value={dst} onChange={pickDst} exclude={src} /></div>
          <div className="swap-amt">
            <div className="recv">{recibis > 0n ? fmtArgt(recibis) : '0,00'}</div>
            <span className="tk">ARGt</span>
          </div>
          <div className="swap-foot"><span>Mismo token, 1:1 (menos dust de 6 dec)</span></div>
        </div>
      </div>

      {/* Ruta */}
      <div className="route">
        <div className="route-row"><span>Ruta</span><span>{CHAINS[src].name} → {CHAINS[dst].name} · LayerZero V2</span></div>
        <div className="route-row"><span>Fee de red</span><span>{quoting ? <span className="spin" /> : fee !== undefined ? `${Number(formatEther(fee)).toFixed(6)} ${CHAINS[src].nativeSymbol}` : '—'}</span></div>
        <div className="route-row"><span>Tiempo estimado</span><span>~1-3 min</span></div>
      </div>

      {raw !== null && amount !== null && raw !== amount && (
        <div className="hint">Se envían ${fmtArgt(amount)} (el bridge opera a 6 decimales).</div>
      )}
      {quotable && !valid && <div className="hint">Fee cotizado — te falta saldo ARGt en {CHAINS[src].name}.</div>}
      {err && <div className="status err">{err}</div>}
      {msg && !err && <div className="status">{msg}</div>}

      <div className="actions">
        <button className="btn primary wide" disabled={!valid || fee === undefined || busy} onClick={() => void go()}>
          {busy ? <span className="spin" /> : 'Bridgear ⇄'}
        </button>
      </div>
    </div>
  )
}
