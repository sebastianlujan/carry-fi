import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useWallet } from '../wallet'
import { useBalances, useVaultPosition, useLoopPosition, useCarryRates } from '../hooks'
import { fmtArgt } from '../chain/format'
import { CHAINS, CHAIN_IDS, ARBITRUM_ID, EXTRA_TOKENS, type ChainId } from '../chain/registry'
import { erc20Abi } from '../chain/abis'
import { clientFor } from '../chain/clients'
import { argtToUsdc } from '../chain/loop'
import { recordSnapshot, readHistory } from '../chain/history'
import ProjectionChart from '../ProjectionChart'
import Bike from '../Bike'
import type { Screen } from '../App'

const usd = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function Home({ go }: { go: (s: Screen) => void }) {
  const { address } = useWallet()
  const { data: balances } = useBalances(address)
  const { data: vault } = useVaultPosition(address)
  const { data: loop } = useLoopPosition(address)
  const { data: rates } = useCarryRates()
  const [sel, setSel] = useState<ChainId | 0>(0) // 0 = todas

  const chainIds = sel === 0 ? CHAIN_IDS : [sel]
  const walletArgt = balances ? chainIds.reduce((a, id) => a + balances[id], 0n) : 0n
  const includeArb = sel === 0 || sel === ARBITRUM_ID
  const vaultArgt = includeArb ? (vault?.argtValue ?? 0n) : 0n
  const loopArgt = includeArb ? (loop?.collateralArgt ?? 0n) : 0n
  const debtUsdc = includeArb ? (loop?.debtUsdc ?? 0n) : 0n
  const totalArgt = walletArgt + vaultArgt + loopArgt

  // patrimonio en USD via oracle live (neto de deuda)
  const { data: patrimonioUsd } = useQuery({
    queryKey: ['patrimonioUsd', totalArgt.toString(), debtUsdc.toString()],
    queryFn: async () => {
      if (totalArgt === 0n && debtUsdc === 0n) return 0
      const grossUsdc = totalArgt === 0n ? 0n : await argtToUsdc(totalArgt)
      const net = grossUsdc - debtUsdc
      return Number(net) / 1e6
    },
  })

  // balances de los otros twins (Arbitrum)
  const { data: extras } = useQuery({
    queryKey: ['extraTokens', address],
    queryFn: async () => {
      const arb = clientFor(ARBITRUM_ID)
      const vals = await Promise.all(EXTRA_TOKENS.map(async (t) => {
        try {
          return await arb.readContract({ address: t.address, abi: erc20Abi, functionName: 'balanceOf', args: [address as `0x${string}`] })
        } catch { return 0n }
      }))
      return vals
    },
    enabled: !!address,
    refetchInterval: 30_000,
  })

  // snapshot diario de la historia (display-only)
  useEffect(() => {
    if (address && patrimonioUsd !== undefined && patrimonioUsd > 0) recordSnapshot(address, patrimonioUsd)
  }, [address, patrimonioUsd])

  const leveraged = debtUsdc > 0n
  const carryApy = rates?.supplyApy ?? 0

  return (
    <div className="screen">
      <div className="who">
        <div className="avatar"><Bike width={30} /></div>
        <div className="nm">
          <b>CarryFi</b>
          <span>tu wallet · la bicicleta, onchain</span>
        </div>
        <select value={sel} onChange={(e) => setSel(Number(e.target.value) as ChainId | 0)}>
          <option value={0}>Todas ▾</option>
          {CHAIN_IDS.map((id) => <option key={id} value={id}>{CHAINS[id].name}</option>)}
        </select>
      </div>

      <div className="patrimonio">
        <div className="lbl">Patrimonio total</div>
        <div className="big">US$ {usd.format(patrimonioUsd ?? 0)}</div>
        <div className="sub2">
          {leveraged
            ? `apalancado · deuda US$ ${usd.format(Number(debtUsdc) / 1e6)}`
            : 'sin apalancamiento'}
          {' · '}${fmtArgt(totalArgt)} ARGt
        </div>
      </div>

      <ProjectionChart
        patrimonioUsd={patrimonioUsd ?? 0}
        carryApy={carryApy}
        history={address ? readHistory(address) : []}
      />

      <div className="actions" style={{ marginTop: 16, paddingTop: 0 }}>
        <button className="btn primary" onClick={() => go('send')}>Enviar <span>↗</span></button>
        <button className="btn ghost" onClick={() => go('receive')}>Recibir <span>↘</span></button>
        <button className="btn ghost wide" style={{ minHeight: 56 }} onClick={() => go('bridge')}>Bridge <span>⇄</span></button>
      </div>

      <div className="tokens">
        <h3>Mis tokens</h3>
        <div className="trow">
          <div className="l"><b>ARGt</b><span>Argentine Peso token</span></div>
          <div className="r">
            <b>{fmtArgt(walletArgt)}</b>
            <span>US$ {usd.format(patrimonioUsd ?? 0)}</span>
          </div>
        </div>
        {EXTRA_TOKENS.map((t, i) => (
          <div className="trow" key={t.symbol}>
            <div className="l"><b>{t.symbol}</b><span>{t.name}</span></div>
            <div className="r">
              <b>{extras ? fmtArgt(extras[i]) : '…'}</b>
              <span>Arbitrum</span>
            </div>
          </div>
        ))}
        {vaultArgt > 0n && (
          <div className="trow">
            <div className="l"><b>sARGt</b><span>ARGt Prime (rindiendo)</span></div>
            <div className="r"><b>{fmtArgt(vaultArgt)}</b><span>en el vault</span></div>
          </div>
        )}
      </div>
    </div>
  )
}
