// Rendimiento. DOS venues:
//  · Market (default): supply directo a Morpho Blue ARGt/USDC → 13,4% real. Posición a tu nombre.
//  · Vault ARGt Prime: el vault ERC-4626 del Milestone 2 (hoy idle ~0%, se mantiene).
// TRAMPA #1: nada de max*() — balance + preview + simulate.
import { useState } from 'react'
import type { Abi } from 'viem'
import { useWallet } from '../wallet'
import { useBalances, useSharePrice, useVaultPosition, useCarryRates, useMarketPosition } from '../hooks'
import { VAULT_ARGT_PRIME, MORPHO, MARKET_ARGT_USDC, CHAINS, ARBITRUM_ID } from '../chain/registry'
import { vaultAbi, morphoAbi } from '../chain/abis'
import { fmtArgt, parseArgt, fmtPct } from '../chain/format'
import { runTx, ensureAllowance, errMsg } from '../tx'
import EarnChart from '../EarnChart'

type Venue = 'market' | 'vault'

export default function Earn() {
  const { address, getSigner } = useWallet()
  const { data: balances, refetch: refetchBal } = useBalances(address)
  const { data: price } = useSharePrice()
  const { data: vaultPos, refetch: refetchVault } = useVaultPosition(address)
  const { data: marketPos, refetch: refetchMarket } = useMarketPosition(address)
  const { data: rates } = useCarryRates()

  const [venue, setVenue] = useState<Venue>('market')
  const [mode, setMode] = useState<'depositar' | 'retirar'>('depositar')
  const [amountStr, setAmountStr] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(''); const [err, setErr] = useState('')

  const balArb = balances?.[ARBITRUM_ID] ?? 0n
  const amount = parseArgt(amountStr)
  const isMarket = venue === 'market'
  const position = isMarket ? (marketPos?.argt ?? 0n) : (vaultPos?.argtValue ?? 0n)
  const venueApy = isMarket ? (rates?.supplyApy ?? 0) : 0 // vault realiza ~0 (idle)
  const accrued = price ? (Number(price) / 1e18 - 1) * 100 : null
  const valid = amount !== null && amount > 0n &&
    (mode === 'depositar' ? amount <= balArb : amount <= position)

  async function go() {
    if (!valid || amount === null || !address) return
    setBusy(true); setErr(''); setMsg('')
    try {
      const signer = await getSigner(ARBITRUM_ID)
      const spender = isMarket ? MORPHO : VAULT_ARGT_PRIME
      if (mode === 'depositar') {
        setMsg('1/2 · Aprobando ARGt…')
        await ensureAllowance(signer, ARBITRUM_ID, CHAINS[ARBITRUM_ID].argt, address, spender, amount)
        setMsg('2/2 · Depositando…')
        if (isMarket) {
          await runTx(signer, { address: MORPHO, abi: morphoAbi as Abi, functionName: 'supply', args: [MARKET_ARGT_USDC, amount, 0n, address, '0x'] })
        } else {
          await runTx(signer, { address: VAULT_ARGT_PRIME, abi: vaultAbi as Abi, functionName: 'deposit', args: [amount, address] })
        }
        setMsg('Depositado ✓ — tus pesos ya están rindiendo.')
      } else {
        setMsg('Retirando…')
        if (isMarket) {
          // retiro total → por shares (exacto); parcial → por assets
          const full = marketPos && amount >= marketPos.argt
          if (full && marketPos) {
            await runTx(signer, { address: MORPHO, abi: morphoAbi as Abi, functionName: 'withdraw', args: [MARKET_ARGT_USDC, 0n, marketPos.shares, address, address] })
          } else {
            await runTx(signer, { address: MORPHO, abi: morphoAbi as Abi, functionName: 'withdraw', args: [MARKET_ARGT_USDC, amount, 0n, address, address] })
          }
        } else {
          const shares = price ? (amount * 10n ** 18n + price - 1n) / price : 0n
          const capped = shares > (vaultPos?.shares ?? 0n) ? (vaultPos?.shares ?? 0n) : shares
          await runTx(signer, { address: VAULT_ARGT_PRIME, abi: vaultAbi as Abi, functionName: 'redeem', args: [capped, address, address] })
        }
        setMsg('Retirado ✓')
      }
      setAmountStr(''); void refetchBal(); void refetchVault(); void refetchMarket()
    } catch (e) { setErr(errMsg(e)) } finally { setBusy(false) }
  }

  return (
    <div className="screen">
      <div className="balance-label">Rindiendo</div>
      <div className="balance" style={{ fontSize: 'clamp(40px,11vw,56px)' }}><span className="cur">$</span>{fmtArgt(position)}</div>
      <div className="sub">{isMarket ? `Market ARGt/USDC · Morpho · ${fmtPct((rates?.supplyApy ?? 0) * 100)} APY` : `Vault ARGt Prime · ${vaultPos ? fmtArgt(vaultPos.shares) : '0'} sARGt`}</div>

      <div className="seg" style={{ marginTop: 14 }}>
        <button className={isMarket ? 'on' : ''} onClick={() => { setVenue('market'); setAmountStr('') }}>Market · {rates ? (rates.supplyApy * 100).toFixed(1) : '…'}%</button>
        <button className={!isMarket ? 'on' : ''} onClick={() => { setVenue('vault'); setAmountStr('') }}>Vault</button>
      </div>

      <div className="card dark">
        <h3>{isMarket ? 'El carry, directo al market' : 'Vault ARGt Prime (Milestone 2)'}</h3>
        {isMarket ? (
          <>
            <div className="row"><span className="k">Supply APY (live)</span><span className="v">{rates ? fmtPct(rates.supplyApy * 100) : '…'}</span></div>
            <div className="row"><span className="k">Utilización</span><span className="v">{rates ? `${(rates.utilization * 100).toFixed(0)}%` : '…'}</span></div>
            <div className="row"><span className="k">Tu posición</span><span className="v">${fmtArgt(position)}</span></div>
          </>
        ) : (
          <>
            <div className="row"><span className="k">Rendimiento acumulado</span><span className="v">{accrued !== null ? fmtPct(accrued) : '…'}</span></div>
            <div className="row"><span className="k">Realizado (idle)</span><span className="v">~0%</span></div>
          </>
        )}
      </div>

      <EarnChart baseArgt={position} apy={venueApy} />

      <div className="seg">
        <button className={mode === 'depositar' ? 'on' : ''} onClick={() => setMode('depositar')}>Depositar</button>
        <button className={mode === 'retirar' ? 'on' : ''} onClick={() => setMode('retirar')}>Retirar</button>
      </div>

      <div className="field">
        <label>Monto en ARGt
          <button className="max-btn" onClick={() => {
            const src = mode === 'depositar' ? balArb : position
            setAmountStr((Number(src / 10n ** 12n) / 1e6).toString().replace('.', ','))
          }}>MAX</button>
        </label>
        <input inputMode="decimal" placeholder="0,00" value={amountStr} onChange={(e) => setAmountStr(e.target.value)} />
        <div className="hint">{mode === 'depositar' ? `Disponible en Arbitrum: $${fmtArgt(balArb)}` : `Rindiendo: $${fmtArgt(position)}`}</div>
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
