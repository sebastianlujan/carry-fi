// El Loop — detrás de un umbral explícito: riesgo → slider → consecuencias → firmar.
// Todos los números salen de tasas on-chain vivas; nada hardcodeado.
import { useState } from 'react'
import type { Abi } from 'viem'
import { useWallet } from '../wallet'
import { useBalances, useCarryRates, useSharePrice, useLoopPosition, useLoopChecks } from '../hooks'
import { CHAINS, ARBITRUM_ID, MORPHO, CARRY_LOOP } from '../chain/registry'
import { carryLoopAbi, morphoAbi } from '../chain/abis'
import { netApy, healthAt, liquidationDrop, argtToUsdc, LLTV } from '../chain/loop'
import { clientFor } from '../chain/clients'
import { fmtArgt, parseArgt, fmtPct } from '../chain/format'
import { runTx, ensureAllowance, errMsg } from '../tx'
import Bike from '../Bike'

type Stage = 'gate' | 'config' | 'confirm'

export default function Loop() {
  const { address, getSigner } = useWallet()
  const { data: balances, refetch: refetchBal } = useBalances(address)
  const { data: rates } = useCarryRates()
  const { data: price } = useSharePrice()
  const { data: pos, refetch: refetchPos } = useLoopPosition(address)
  const { data: checks } = useLoopChecks()

  const [stage, setStage] = useState<Stage>('gate')
  const [accepted, setAccepted] = useState(false)
  const [palanca, setPalanca] = useState(2)
  const [amountStr, setAmountStr] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(''); const [err, setErr] = useState('')

  const balArb = balances?.[ARBITRUM_ID] ?? 0n
  const equity = parseArgt(amountStr)

  // APY del vault: rendimiento acumulado anualizado no es honesto sin ventana; usamos
  // el APY del carry de referencia como techo y el acumulado como piso — ambos a la vista.
  const vaultAccrued = price ? Number(price) / 1e18 - 1 : 0
  const borrowApy = rates?.borrowApy ?? 0
  const carryApy = rates?.supplyApy ?? 0
  const net = netApy(palanca, carryApy, borrowApy)
  const health = healthAt(palanca)
  const drop = liquidationDrop(palanca)
  const executable = !!checks && checks.deployed && checks.marketLive

  const hasPosition = !!pos && pos.collateralShares > 0n

  async function execute() {
    if (!address || equity === null || equity <= 0n || !CARRY_LOOP) return
    setBusy(true); setErr(''); setMsg('')
    try {
      const signer = await getSigner(ARBITRUM_ID)
      const flashUsdc = await argtToUsdc((equity * BigInt(Math.round((palanca - 1) * 1000))) / 1000n)
      setMsg('1/3 · Autorizando el router en Morpho…')
      const authorized = await clientFor(ARBITRUM_ID).readContract({
        address: MORPHO, abi: morphoAbi, functionName: 'isAuthorized', args: [address, CARRY_LOOP],
      })
      if (!authorized) {
        await runTx(signer, { address: MORPHO, abi: morphoAbi as Abi, functionName: 'setAuthorization', args: [CARRY_LOOP, true] })
      }
      setMsg('2/3 · Aprobando ARGt…')
      await ensureAllowance(signer, ARBITRUM_ID, CHAINS[ARBITRUM_ID].argt, address, CARRY_LOOP, equity)
      setMsg('3/3 · Ejecutando leverage (flash loan + depósito + colateral + deuda)…')
      const minArgtOut = ((equity * BigInt(Math.round((palanca - 1) * 1000))) / 1000n) * 97n / 100n
      await runTx(signer, {
        address: CARRY_LOOP, abi: carryLoopAbi as Abi, functionName: 'leverage', args: [equity, flashUsdc, minArgtOut],
      })
      setMsg('Loop armado ✓'); setStage('gate'); setAmountStr('')
      void refetchBal(); void refetchPos()
    } catch (e) { setErr(errMsg(e)) } finally { setBusy(false) }
  }

  async function unwind() {
    if (!address || !CARRY_LOOP || !pos) return
    setBusy(true); setErr(''); setMsg('Cerrando el loop (flash + repay + retiro)…')
    try {
      const signer = await getSigner(ARBITRUM_ID)
      const maxArgtIn = (pos.collateralArgt * 105n) / 100n
      await runTx(signer, {
        address: CARRY_LOOP, abi: carryLoopAbi as Abi, functionName: 'deleverage',
        args: [2n ** 256n - 1n, maxArgtIn],
      })
      setMsg('Loop cerrado ✓ — capital de vuelta en tu wallet.')
      void refetchBal(); void refetchPos()
    } catch (e) { setErr(errMsg(e)) } finally { setBusy(false) }
  }

  // ── posición viva ──
  if (hasPosition && stage === 'gate') {
    const h = pos.debtUsdc > 0n ? Number(pos.healthWad) / 1e18 : Infinity
    return (
      <div className="screen">
        <div style={{ marginTop: 14 }}><Bike width={64} spin /></div>
        <div className="balance-label">Pedaleando</div>
        <div className="balance"><span className="cur">$</span>{fmtArgt(pos.collateralArgt)}</div>
        <div className="sub">colateral sARGt en tu nombre · deuda {(Number(pos.debtUsdc) / 1e6).toFixed(2)} US$</div>
        <div className="card dark">
          <div className="row"><span className="k">Salud</span>
            <span className={`v ${h > 1.5 ? 'health-good' : h > 1.15 ? 'health-warn' : 'health-bad'}`}>{h === Infinity ? '∞' : h.toFixed(2)}</span></div>
          <div className="row"><span className="k">LLTV del market</span><span className="v">{(LLTV * 100).toFixed(0)}%</span></div>
          <div className="row"><span className="k">Tasa de la deuda (live)</span><span className="v">{fmtPct(borrowApy * 100)}</span></div>
        </div>
        <div className="banner">Posición a tu nombre en Morpho: podés salir directo, sin CarryFi.</div>
        {err && <div className="status err">{err}</div>}
        {msg && !err && <div className="status">{msg}</div>}
        <div className="actions">
          <button className="btn primary wide" disabled={busy} onClick={() => void unwind()}>
            {busy ? <span className="spin" /> : 'Cerrar loop ↘'}
          </button>
        </div>
      </div>
    )
  }

  // ── etapa 0: umbral de riesgo ──
  if (stage === 'gate') {
    return (
      <div className="screen">
        <div style={{ marginTop: 18 }}><Bike width={92} spin /></div>
        <div className="title" style={{ marginTop: 8 }}>La bicicleta</div>
        <div className="sub">El loop del carry, on-chain y a tu nombre. No es una caja de ahorro.</div>

        <div className="card">
          <h3>Cómo funciona</h3>
          <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.55 }}>
            Flash loan → vault → colateral <b>a tu nombre</b> → deuda en USDC.
            Una transacción para entrar, una para salir.
          </div>
        </div>
        <div className="card">
          <h3>El riesgo, sin vueltas</h3>
          <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.55 }}>
            Deuda en dólares, colateral en pesos. <b>Si el peso cae ~{(liquidationDrop(2) * 100).toFixed(0)}%
            (a palanca 2×), te liquidan.</b> El rendimiento es tuyo porque el riesgo también.
          </div>
        </div>
        {checks && !executable && (
          <div className="banner warn">
            <b>Hoy no ejecutable en mainnet:</b> falta liquidez DEX ARGt/USDC. La máquina está probada en fork.
          </div>
        )}
        <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginTop: 14, fontSize: 14, fontWeight: 700 }}>
          <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} style={{ width: 20, height: 20, accentColor: '#141414' }} />
          Entiendo que puedo ser liquidado si el peso se devalúa.
        </label>
        <div className="actions">
          <button className="btn primary wide" disabled={!accepted} onClick={() => setStage('config')}>
            Ver los números →
          </button>
        </div>
      </div>
    )
  }

  // ── etapa 1: slider ──
  if (stage === 'config') {
    return (
      <div className="screen">
        <button className="back" onClick={() => setStage('gate')}>← Riesgo</button>
        <div className="title">Elegí tu palanca</div>

        <div className="card dark">
          <div className="big-stat">{fmtPct(net * 100, 1)}</div>
          <div className="row"><span className="k">APY neto estimado a palanca {palanca.toFixed(2)}×</span><span className="v" /></div>
          <hr className="divider" style={{ borderColor: 'rgba(255,254,245,.15)' }} />
          <div className="row"><span className="k">+ carry (live, market ARGt/USDC)</span><span className="v">{fmtPct(carryApy * 100)} × {palanca.toFixed(2)}</span></div>
          <div className="row"><span className="k">− deuda USDC (live)</span><span className="v">{fmtPct(-borrowApy * 100)} × {(palanca - 1).toFixed(2)}</span></div>
          <div className="row"><span className="k">− swaps amortizados</span><span className="v">~{fmtPct(-(2 * (palanca - 1) * 0.003) * 100)}</span></div>
        </div>

        <input className="slider" type="range" min={1.1} max={2.5} step={0.05} value={palanca} onChange={(e) => setPalanca(Number(e.target.value))} />
        <div className="row"><span className="k">Palanca {palanca.toFixed(2)}×</span><span className="k">salud inicial {health.toFixed(2)}</span></div>

        <div className="card">
          <div className="row"><span className="k">Te liquidan si ARGt cae</span>
            <span className={`v ${drop > 0.3 ? 'health-good' : drop > 0.15 ? 'health-warn' : 'health-bad'}`}>−{(drop * 100).toFixed(1)}%</span></div>
          <div className="row"><span className="k">Rendimiento acumulado del vault</span><span className="v">{fmtPct(vaultAccrued * 100)}</span></div>
        </div>

        <div className="field">
          <label>Equity en ARGt <button className="max-btn" onClick={() => setAmountStr((Number(balArb / 10n ** 12n) / 1e6).toString().replace('.', ','))}>MAX</button></label>
          <input inputMode="decimal" placeholder="0,00" value={amountStr} onChange={(e) => setAmountStr(e.target.value)} />
          <div className="hint">Disponible en Arbitrum: ${fmtArgt(balArb)}</div>
        </div>

        <div className="actions">
          <button className="btn primary wide" disabled={equity === null || equity <= 0n || equity > balArb} onClick={() => setStage('confirm')}>
            Revisar consecuencias →
          </button>
        </div>
      </div>
    )
  }

  // ── etapa 2: confirmación con consecuencias ──
  const eq = equity ?? 0n
  const exposure = (eq * BigInt(Math.round(palanca * 100))) / 100n
  const debtArgt = (eq * BigInt(Math.round((palanca - 1) * 100))) / 100n
  return (
    <div className="screen">
      <button className="back" onClick={() => setStage('config')}>← Ajustar</button>
      <div className="title">Consecuencias</div>
      <div className="card dark">
        <div className="row"><span className="k">Ponés</span><span className="v">${fmtArgt(eq)} ARGt</span></div>
        <div className="row"><span className="k">Exposición total</span><span className="v">${fmtArgt(exposure)} en el vault</span></div>
        <div className="row"><span className="k">Deuda que tomás</span><span className="v">≈ ${fmtArgt(debtArgt)} en USDC</span></div>
        <div className="row"><span className="k">Salud inicial</span><span className="v">{health.toFixed(2)}</span></div>
        <div className="row"><span className="k">Liquidación si ARGt cae</span><span className="v health-warn">−{(drop * 100).toFixed(1)}%</span></div>
        <div className="row"><span className="k">APY neto estimado (live)</span><span className="v">{fmtPct(net * 100, 1)}</span></div>
      </div>
      <div className="banner">
        Hasta 3 firmas: autorizar el router (una vez), aprobar ARGt, y el loop atómico.
        Todo queda a tu nombre.
      </div>
      {!executable && (
        <div className="banner err"><b>Ejecución deshabilitada:</b> {checks?.reason ?? 'infraestructura incompleta.'}</div>
      )}
      {err && <div className="status err">{err}</div>}
      {msg && !err && <div className="status">{msg}</div>}
      <div className="actions">
        <button className="btn primary wide" disabled={!executable || busy} onClick={() => void execute()}>
          {busy ? <span className="spin" /> : 'Firmar el loop ↗'}
        </button>
      </div>
    </div>
  )
}
