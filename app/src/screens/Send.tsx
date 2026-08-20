import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { isAddress, type Address, type Abi } from 'viem'
import { useWallet } from '../wallet'
import { CHAINS, TOKENS, type ChainId, ARBITRUM_ID } from '../chain/registry'
import { erc20Abi } from '../chain/abis'
import { clientFor } from '../chain/clients'
import { fmtArgt, parseArgt, shortAddr } from '../chain/format'
import { useNetwork } from '../network'
import { runTx, errMsg } from '../tx'

type Step = 'form' | 'confirm' | 'done'

export default function Send({ back }: { back: () => void }) {
  const { address, getSigner } = useWallet()
  const { sel } = useNetwork()
  const [tokenIx, setTokenIx] = useState(0)
  const token = TOKENS[tokenIx]
  const chainsForToken = (Object.keys(token.byChain).map(Number) as ChainId[])
  const initChain = sel !== 0 && token.byChain[sel] ? sel : (chainsForToken.includes(ARBITRUM_ID) ? ARBITRUM_ID : chainsForToken[0])
  const [chain, setChain] = useState<ChainId>(initChain)
  const tokenAddr = token.byChain[chain]!

  const [to, setTo] = useState('')
  const [amountStr, setAmountStr] = useState('')
  const [step, setStep] = useState<Step>('form')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [hash, setHash] = useState('')

  const { data: bal, refetch } = useQuery({
    queryKey: ['tokenBal', tokenAddr, chain, address],
    queryFn: () => clientFor(chain).readContract({ address: tokenAddr, abi: erc20Abi, functionName: 'balanceOf', args: [address as Address] }),
    enabled: !!address,
    refetchInterval: 15_000,
  })
  const balance = bal ?? 0n

  const amount = parseArgt(amountStr)
  const valid = amount !== null && amount > 0n && amount <= balance && isAddress(to)

  function pickToken(ix: number) {
    setTokenIx(ix)
    const t = TOKENS[ix]
    if (!t.byChain[chain]) setChain((Object.keys(t.byChain).map(Number) as ChainId[])[0])
  }

  async function submit() {
    if (!valid || amount === null) return
    setBusy(true); setErr('')
    try {
      const signer = await getSigner(chain)
      const h = await runTx(signer, { address: tokenAddr, abi: erc20Abi as Abi, functionName: 'transfer', args: [to as Address, amount] })
      setHash(h); setStep('done'); void refetch()
    } catch (e) { setErr(errMsg(e)) } finally { setBusy(false) }
  }

  if (step === 'done') {
    return (
      <div className="screen">
        <button className="back" onClick={back}>← Wallet</button>
        <div className="title">Enviado ✓</div>
        <div className="card">
          <div className="row"><span className="k">Monto</span><span className="v">${amountStr} {token.symbol}</span></div>
          <div className="row"><span className="k">Red</span><span className="v">{CHAINS[chain].name}</span></div>
        </div>
        <a className="banner" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
           href={`${CHAINS[chain].explorer}/tx/${hash}`} target="_blank" rel="noreferrer">Ver en el explorer ↗</a>
        <div className="actions"><button className="btn primary wide" onClick={back}>Listo</button></div>
      </div>
    )
  }

  return (
    <div className="screen">
      <button className="back" onClick={() => (step === 'confirm' ? setStep('form') : back())}>← Volver</button>
      <div className="title">{step === 'form' ? 'Enviar' : 'Confirmar envío'}</div>

      {step === 'form' && (
        <>
          <div className="seg">
            {TOKENS.map((t, i) => (
              <button key={t.symbol} className={i === tokenIx ? 'on' : ''} onClick={() => pickToken(i)}>{t.symbol}</button>
            ))}
          </div>
          <div className="field">
            <label>Red</label>
            <select value={chain} onChange={(e) => setChain(Number(e.target.value) as ChainId)}>
              {chainsForToken.map((id) => <option key={id} value={id}>{CHAINS[id].name}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Monto <button className="max-btn" onClick={() => setAmountStr((Number(balance / 10n ** 12n) / 1e6).toString().replace('.', ','))}>MAX</button></label>
            <input inputMode="decimal" placeholder="0,00" value={amountStr} onChange={(e) => setAmountStr(e.target.value)} />
            <div className="hint">Disponible: ${fmtArgt(balance)} {token.symbol} en {CHAINS[chain].name}</div>
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
            <div className="row"><span className="k">{token.symbol} en</span><span className="v">{CHAINS[chain].name}</span></div>
            <div className="row"><span className="k">Para</span><span className="v mono">{shortAddr(to)}</span></div>
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
