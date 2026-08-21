// Rendimiento multi-activo. Elegís el activo (ARGt/BRAt) y el venue:
//  · Market (default): supply directo al market Morpho Blue del activo → carry real (~12-13%).
//  · Vault Prime: el vault ERC-4626 del activo (hoy idle ~0%). ARGt = Milestone 2.
// TRAMPA #1: nada de max*() — balance + preview + simulate. Todos los twins 18 dec.
import { useState } from 'react'
import type { Abi, Address } from 'viem'
import { useQuery } from '@tanstack/react-query'
import { useWallet } from '../wallet'
import { useSharePrice, useVaultPosition, useCarryRates, useMarketPosition } from '../hooks'
import { MORPHO, EARN_ASSETS, ARBITRUM_ID, SHARED_DECIMALS_UNIT } from '../chain/registry'
import { vaultAbi, morphoAbi, erc20Abi } from '../chain/abis'
import { clientFor } from '../chain/clients'
import { fmtArgt, parseArgt, fmtPct } from '../chain/format'
import { runTx, ensureAllowance, errMsg } from '../tx'
import EarnChart from '../EarnChart'

type Venue = 'market' | 'vault'

export default function Earn() {
  const { address, getSigner } = useWallet()
  const [assetIx, setAssetIx] = useState(0)
  const [marketIx, setMarketIx] = useState(0)
  const asset = EARN_ASSETS[assetIx]
  const market = asset.markets[marketIx] ?? asset.markets[0]

  const { data: price } = useSharePrice(asset.vault)
  const { data: vaultPos, refetch: refetchVault } = useVaultPosition(address, asset.vault)
  const { data: marketPos, refetch: refetchMarket } = useMarketPosition(address, market.id)
  const { data: rates } = useCarryRates(market.id)
  const { data: bal, refetch: refetchBal } = useQuery({
    queryKey: ['earnBal', asset.token, address],
    queryFn: () => clientFor(ARBITRUM_ID).readContract({ address: asset.token, abi: erc20Abi, functionName: 'balanceOf', args: [address as Address] }),
    enabled: !!address,
    refetchInterval: 15_000,
  })
  const balArb = bal ?? 0n

  const [venue, setVenue] = useState<Venue>('market')
  const [mode, setMode] = useState<'depositar' | 'retirar'>('depositar')
  const [amountStr, setAmountStr] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(''); const [err, setErr] = useState('')

  const amount = parseArgt(amountStr)
  const isMarket = venue === 'market'
  const position = isMarket ? (marketPos?.assets ?? 0n) : (vaultPos?.argtValue ?? 0n)
  const venueApy = isMarket ? (rates?.supplyApy ?? 0) : 0
  const accrued = price ? (Number(price) / 1e18 - 1) * 100 : null
  const valid = amount !== null && amount > 0n &&
    (mode === 'depositar' ? amount <= balArb : amount <= position)

  function pickAsset(ix: number) { setAssetIx(ix); setMarketIx(0); setAmountStr('') }

  async function go() {
    if (!valid || amount === null || !address) return
    setBusy(true); setErr(''); setMsg('')
    try {
      const signer = await getSigner(ARBITRUM_ID)
      const spender = isMarket ? MORPHO : asset.vault
      if (mode === 'depositar') {
        setMsg('1/2 · Aprobando…')
        await ensureAllowance(signer, ARBITRUM_ID, asset.token, address, spender, amount)
        setMsg('2/2 · Depositando…')
        if (isMarket) {
          await runTx(signer, { address: MORPHO, abi: morphoAbi as Abi, functionName: 'supply', args: [market.params, amount, 0n, address, '0x'] })
        } else {
          await runTx(signer, { address: asset.vault, abi: vaultAbi as Abi, functionName: 'deposit', args: [amount, address] })
        }
        setMsg('Depositado ✓ — rindiendo.')
      } else {
        setMsg('Retirando…')
        if (isMarket) {
          const full = !!marketPos && marketPos.shares > 0n &&
            (amount >= marketPos.assets || marketPos.assets - amount < SHARED_DECIMALS_UNIT)
          if (full && marketPos) {
            await runTx(signer, { address: MORPHO, abi: morphoAbi as Abi, functionName: 'withdraw', args: [market.params, 0n, marketPos.shares, address, address] })
          } else {
            await runTx(signer, { address: MORPHO, abi: morphoAbi as Abi, functionName: 'withdraw', args: [market.params, amount, 0n, address, address] })
          }
        } else {
          const shares = price ? (amount * 10n ** 18n + price - 1n) / price : 0n
          const capped = shares > (vaultPos?.shares ?? 0n) ? (vaultPos?.shares ?? 0n) : shares
          await runTx(signer, { address: asset.vault, abi: vaultAbi as Abi, functionName: 'redeem', args: [capped, address, address] })
        }
        setMsg('Retirado ✓')
      }
      setAmountStr(''); void refetchBal(); void refetchVault(); void refetchMarket()
    } catch (e) { setErr(errMsg(e)) } finally { setBusy(false) }
  }

  return (
    <div className="screen">
      <div className="seg" style={{ marginTop: 8 }}>
        {EARN_ASSETS.map((a, i) => (
          <button key={a.symbol} className={i === assetIx ? 'on' : ''} onClick={() => pickAsset(i)}>{a.symbol}</button>
        ))}
      </div>

      <div className="balance-label" style={{ marginTop: 14 }}>Rindiendo</div>
      <div className="balance" style={{ fontSize: 'clamp(38px,10vw,52px)' }}><span className="cur">$</span>{fmtArgt(position)}</div>
      <div className="sub">{isMarket ? `Market ${asset.symbol}/${market.label} · Morpho · ${fmtPct((rates?.supplyApy ?? 0) * 100)} APY` : `${asset.symbol} Prime · ${vaultPos ? fmtArgt(vaultPos.shares) : '0'} s${asset.symbol}`}</div>

      <div className="seg" style={{ marginTop: 14 }}>
        <button className={isMarket ? 'on' : ''} onClick={() => { setVenue('market'); setAmountStr('') }}>Market · {rates ? (rates.supplyApy * 100).toFixed(1) : '…'}%</button>
        <button className={!isMarket ? 'on' : ''} onClick={() => { setVenue('vault'); setAmountStr('') }}>Vault</button>
      </div>

      {isMarket && asset.markets.length > 1 && (
        <div className="collat-row">
          <span className="collat-label">Colateral</span>
          {asset.markets.map((mk, i) => (
            <button key={mk.label} className={i === marketIx ? 'on' : ''} onClick={() => { setMarketIx(i); setAmountStr('') }}>
              {mk.label === 'syrupUSDC' ? 'syrupUSDC · Maple' : mk.label}
            </button>
          ))}
        </div>
      )}

      <div className="card dark">
        <h3>{isMarket ? `El carry ${asset.symbol}, directo al market` : `${asset.symbol} Prime${asset.symbol === 'ARGt' ? ' (Milestone 2)' : ''}`}</h3>
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
        <label>Monto en {asset.symbol}
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
