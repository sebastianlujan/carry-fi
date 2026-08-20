// Rendimiento — Milestone 2: vault ARGt Prime (ERC-4626 síncrono).
// TRAMPA #1: nada de max*() — validamos con balance + preview + simulate.
import { useState } from 'react'
import type { Abi } from 'viem'
import { useWallet } from '../wallet'
import { useBalances, useSharePrice, useVaultPosition, useCarryRates } from '../hooks'
import { VAULT_ARGT_PRIME, CHAINS, ARBITRUM_ID } from '../chain/registry'
import { vaultAbi } from '../chain/abis'
import { fmtArgt, parseArgt, fmtPct } from '../chain/format'
import { runTx, ensureAllowance, errMsg } from '../tx'
import EarnChart from '../EarnChart'
import { addBaseline } from '../chain/baseline'

export default function Earn() {
  const { address, getSigner } = useWallet()
  const { data: balances, refetch: refetchBal } = useBalances(address)
  const { data: price } = useSharePrice()
  const { data: pos, refetch: refetchPos } = useVaultPosition(address)
  const { data: rates } = useCarryRates()

  const [mode, setMode] = useState<'depositar' | 'retirar'>('depositar')
  const [amountStr, setAmountStr] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(''); const [err, setErr] = useState('')

  const balArb = balances?.[ARBITRUM_ID] ?? 0n
  const amount = parseArgt(amountStr)
  const accrued = price ? (Number(price) / 1e18 - 1) * 100 : null
  const valid = amount !== null && amount > 0n &&
    (mode === 'depositar' ? amount <= balArb : amount <= (pos?.argtValue ?? 0n))

  async function go() {
    if (!valid || amount === null || !address) return
    setBusy(true); setErr(''); setMsg('')
    try {
      const signer = await getSigner(ARBITRUM_ID)
      if (mode === 'depositar') {
        setMsg('1/2 · Aprobando ARGt…')
        await ensureAllowance(signer, ARBITRUM_ID, CHAINS[ARBITRUM_ID].argt, address, VAULT_ARGT_PRIME, amount)
        setMsg('2/2 · Depositando…')
        await runTx(signer, { address: VAULT_ARGT_PRIME, abi: vaultAbi as Abi, functionName: 'deposit', args: [amount, address] })
        addBaseline(address, amount)
        setMsg('Depositado ✓ — tus pesos ya están rindiendo.')
      } else {
        // ARGt deseado → shares vía share price live (redondeo hacia arriba, capped al balance)
        const shares = price ? (amount * 10n ** 18n + price - 1n) / price : 0n
        const capped = shares > (pos?.shares ?? 0n) ? (pos?.shares ?? 0n) : shares
        setMsg('Retirando…')
        await runTx(signer, { address: VAULT_ARGT_PRIME, abi: vaultAbi as Abi, functionName: 'redeem', args: [capped, address, address] })
        addBaseline(address, -amount)
        setMsg('Retirado ✓')
      }
      setAmountStr(''); void refetchBal(); void refetchPos()
    } catch (e) { setErr(errMsg(e)) } finally { setBusy(false) }
  }

  return (
    <div className="screen">
      <div className="balance-label">Rindiendo</div>
      <div className="balance"><span className="cur">$</span>{fmtArgt(pos?.argtValue ?? 0n)}</div>
      <div className="sub">Vault ARGt Prime · Arbitrum · {pos ? fmtArgt(pos.shares) : '0'} sARGt</div>

      <div className="card dark">
        <h3>El carry, en números vivos</h3>
        <div className="row"><span className="k">Rendimiento acumulado del vault</span>
          <span className="v">{accrued !== null ? fmtPct(accrued) : '…'}</span></div>
        <div className="row"><span className="k">Tasa del carry ARGt/USDC (Morpho)</span>
          <span className="v">{rates ? fmtPct(rates.supplyApy * 100) : '…'} APY</span></div>
        <div className="row"><span className="k">Utilización del market</span>
          <span className="v">{rates ? `${(rates.utilization * 100).toFixed(0)}%` : '…'}</span></div>
      </div>

      <EarnChart baseArgt={pos?.argtValue ?? 0n} apy={rates?.supplyApy ?? 0} />

      <div className="seg">
        <button className={mode === 'depositar' ? 'on' : ''} onClick={() => setMode('depositar')}>Depositar</button>
        <button className={mode === 'retirar' ? 'on' : ''} onClick={() => setMode('retirar')}>Retirar</button>
      </div>

      <div className="field">
        <label>Monto en ARGt
          <button className="max-btn" onClick={() => {
            const src = mode === 'depositar' ? balArb : (pos?.argtValue ?? 0n)
            setAmountStr((Number(src / 10n ** 12n) / 1e6).toString().replace('.', ','))
          }}>MAX</button>
        </label>
        <input inputMode="decimal" placeholder="0,00" value={amountStr} onChange={(e) => setAmountStr(e.target.value)} />
        <div className="hint">
          {mode === 'depositar' ? `Disponible en Arbitrum: $${fmtArgt(balArb)}` : `En el vault: $${fmtArgt(pos?.argtValue ?? 0n)}`}
        </div>
      </div>

      {err && <div className="status err">{err}</div>}
      {msg && !err && <div className="status">{msg}</div>}

      <div className="actions">
        <button className="btn primary wide" disabled={!valid || busy} onClick={() => void go()}>
          {busy ? <span className="spin" /> : mode === 'depositar' ? 'Depositar ↗' : 'Retirar ↘'}
        </button>
      </div>
    </div>
  )
}
