import { useState } from 'react'
import { isAddress, type Address, type Abi } from 'viem'
import { useWallet } from '../wallet'
import { useBalances } from '../hooks'
import { CHAINS, CHAIN_IDS, type ChainId, ARBITRUM_ID } from '../chain/registry'
import { erc20Abi } from '../chain/abis'
import { fmtArgt, parseArgt } from '../chain/format'
import { runTx, errMsg } from '../tx'
import { useNetwork } from '../network'

type Step = 'form' | 'confirm' | 'done'

export default function Send({ back }: { back: () => void }) {
  const { address, getSigner } = useWallet()
  const { data: balances, refetch } = useBalances(address)
  const { sel } = useNetwork()
  const [chain, setChain] = useState<ChainId>(sel === 0 ? ARBITRUM_ID : sel)
  const [to, setTo] = useState('')
  const [amountStr, setAmountStr] = useState('')
  const [step, setStep] = useState<Step>('form')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [hash, setHash] = useState('')

  const amount = parseArgt(amountStr)
  const bal = balances?.[chain] ?? 0n
  const valid = amount !== null && amount > 0n && amount <= bal && isAddress(to)

  async function submit() {
    if (!valid || amount === null) return
    setBusy(true); setErr('')
    try {
      const signer = await getSigner(chain)
      const h = await runTx(signer, {
        address: CHAINS[chain].argt, abi: erc20Abi as Abi, functionName: 'transfer', args: [to as Address, amount],
      })
      setHash(h); setStep('done'); void refetch()
    } catch (e) { setErr(errMsg(e)) } finally { setBusy(false) }
  }

  if (step === 'done') {
    return (
      <div className="screen">
        <button className="back" onClick={back}>← Wallet</button>
        <div className="title">Enviado ✓</div>
        <div className="card">
          <div className="row"><span className="k">Monto</span><span className="v">${amountStr} ARGt</span></div>
          <div className="row"><span className="k">Red</span><span className="v">{CHAINS[chain].name}</span></div>
        </div>
        <a className="banner" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
           href={`${CHAINS[chain].explorer}/tx/${hash}`} target="_blank" rel="noreferrer">
          Ver en el explorer ↗
        </a>
        <div className="actions"><button className="btn primary wide" onClick={back}>Listo</button></div>
      </div>
    )
  }

  return (
    <div className="screen">
      <button className="back" onClick={() => (step === 'confirm' ? setStep('form') : back())}>← Volver</button>
      <div className="title">{step === 'form' ? 'Enviar ARGt' : 'Confirmar envío'}</div>

      {step === 'form' && (
        <>
          <div className="field">
            <label>Red</label>
            <select value={chain} onChange={(e) => setChain(Number(e.target.value) as ChainId)}>
              {CHAIN_IDS.map((id) => (
                <option key={id} value={id}>{CHAINS[id].name} — ${fmtArgt(balances?.[id] ?? 0n)}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Monto <button className="max-btn" onClick={() => setAmountStr((Number(bal / 10n ** 12n) / 1e6).toString().replace('.', ','))}>MAX</button></label>
            <input inputMode="decimal" placeholder="0,00" value={amountStr} onChange={(e) => setAmountStr(e.target.value)} />
            <div className="hint">Disponible: ${fmtArgt(bal)} ARGt en {CHAINS[chain].name}</div>
          </div>
          <div className="field">
            <label>Destinatario</label>
            <input placeholder="0x…" value={to} onChange={(e) => setTo(e.target.value.trim())} spellCheck={false} />
          </div>
          <div className="actions">
            <button className="btn primary wide" disabled={!valid} onClick={() => setStep('confirm')}>Continuar →</button>
          </div>
        </>
      )}

      {step === 'confirm' && (
        <>
          <div className="card dark">
            <div className="big-stat">${amountStr}</div>
            <div className="row"><span className="k">ARGt en</span><span className="v">{CHAINS[chain].name}</span></div>
            <div className="row"><span className="k">Para</span><span className="v mono">{to.slice(0, 10)}…{to.slice(-6)}</span></div>
          </div>
          <div className="banner">Transferencia on-chain directa desde tu wallet. Irreversible una vez confirmada.</div>
          {err && <div className="status err">{err}</div>}
          <div className="actions">
            <button className="btn primary wide" disabled={busy} onClick={() => void submit()}>
              {busy ? <span className="spin" /> : 'Firmar y enviar ↗'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
