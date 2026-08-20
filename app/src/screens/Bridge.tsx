// Bridge — Milestone 3: LayerZero V2 OFT. Trampas #3 (dust 1e12) y #4 (extraOptions=0x).
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
import { runTx, ensureAllowance, errMsg } from '../tx'

export default function Bridge({ back }: { back: () => void }) {
  const { address, getSigner } = useWallet()
  const { data: balances, refetch } = useBalances(address)
  const [src, setSrc] = useState<ChainId>(ARBITRUM_ID)
  const [dst, setDst] = useState<ChainId>(BASE_ID)
  const [amountStr, setAmountStr] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(''); const [err, setErr] = useState(''); const [done, setDone] = useState('')

  const raw = parseArgt(amountStr)
  const amount = raw !== null ? floorToShared(raw) : null
  const bal = balances?.[src] ?? 0n
  const valid = amount !== null && amount > 0n && amount <= bal && src !== dst && !!address

  const { data: fee, isFetching: quoting } = useQuery({
    queryKey: ['bridgeFee', src, dst, amount?.toString(), address],
    queryFn: () => quoteBridge(src, dst, address!, amount!),
    enabled: valid,
    refetchInterval: 20_000,
  })

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
          Seguir el mensaje en LayerZero Scan ↗ (llega en ~1-3 min)
        </a>
        <div className="actions"><button className="btn primary wide" onClick={back}>Listo</button></div>
      </div>
    )
  }

  return (
    <div className="screen">
      <button className="back" onClick={back}>← Volver</button>
      <div className="title">Bridge ARGt</div>

      <div className="field">
        <label>Desde</label>
        <select value={src} onChange={(e) => { const v = Number(e.target.value) as ChainId; setSrc(v); if (v === dst) setDst(CHAIN_IDS.find((c) => c !== v)!) }}>
          {CHAIN_IDS.map((id) => <option key={id} value={id}>{CHAINS[id].name} — ${fmtArgt(balances?.[id] ?? 0n)}</option>)}
        </select>
      </div>
      <div className="field">
        <label>Hacia</label>
        <select value={dst} onChange={(e) => setDst(Number(e.target.value) as ChainId)}>
          {CHAIN_IDS.filter((id) => id !== src).map((id) => <option key={id} value={id}>{CHAINS[id].name}</option>)}
        </select>
      </div>
      <div className="field">
        <label>Monto <button className="max-btn" onClick={() => setAmountStr((Number(floorToShared(bal) / 10n ** 12n) / 1e6).toString().replace('.', ','))}>MAX</button></label>
        <input inputMode="decimal" placeholder="0,00" value={amountStr} onChange={(e) => setAmountStr(e.target.value)} />
        {raw !== null && amount !== null && raw !== amount && (
          <div className="hint">El bridge opera a 6 decimales: se envían ${fmtArgt(amount)} (el resto queda en tu wallet).</div>
        )}
      </div>

      <div className="card">
        <div className="row"><span className="k">Fee de mensajería</span>
          <span className="v">{quoting ? <span className="spin" /> : fee !== undefined ? `${Number(formatEther(fee)).toFixed(6)} ${CHAINS[src].nativeSymbol}` : '—'}</span></div>
        <div className="row"><span className="k">Recibís en {CHAINS[dst].name}</span>
          <span className="v">{amount !== null ? `$${fmtArgt(amount)}` : '—'}</span></div>
      </div>

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
