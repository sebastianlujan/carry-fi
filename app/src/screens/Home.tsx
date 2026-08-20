import { useQuery } from '@tanstack/react-query'
import { useWallet } from '../wallet'
import { useBalances, useVaultPosition, useLoopPosition } from '../hooks'
import { fmtMoney, fmtArgt } from '../chain/format'
import { CHAINS, CHAIN_IDS, ARBITRUM_ID, EXTRA_TOKENS } from '../chain/registry'
import { erc20Abi } from '../chain/abis'
import { clientFor } from '../chain/clients'
import { argtToUsdc } from '../chain/loop'
import { getBaseline } from '../chain/baseline'
import { IconShield, Chevron } from '../Icons'
import NetworkPicker from '../NetworkPicker'
import { useNetwork } from '../network'
import type { Screen } from '../App'

export default function Home({ go }: { go: (s: Screen) => void }) {
  const { address } = useWallet()
  const { data: balances } = useBalances(address)
  const { data: vault } = useVaultPosition(address)
  const { data: loop } = useLoopPosition(address)
  const { sel } = useNetwork()

  const chainIds = sel === 0 ? CHAIN_IDS : [sel]
  const includeArb = sel === 0 || sel === 42161
  const walletArgt = balances ? chainIds.reduce((a, id) => a + balances[id], 0n) : 0n
  const vaultArgt = includeArb ? (vault?.argtValue ?? 0n) : 0n
  const loopArgt = includeArb ? (loop?.collateralArgt ?? 0n) : 0n
  const debtUsdc = includeArb ? (loop?.debtUsdc ?? 0n) : 0n

  const { data: debtArgt } = useQuery({
    queryKey: ['debtArgt', debtUsdc.toString()],
    queryFn: async () => {
      if (debtUsdc === 0n) return 0n
      const oneArgtInUsdc = await argtToUsdc(10n ** 18n)
      return oneArgtInUsdc === 0n ? 0n : (debtUsdc * 10n ** 18n) / oneArgtInUsdc
    },
  })

  const working = vaultArgt + loopArgt - (debtArgt ?? 0n) // capital trabajando
  const total = walletArgt + working
  // ganancia = valor actual − capital aportado (baseline local por address); nunca negativa en display
  const rawGains = vault && address ? vault.argtValue - getBaseline(address) : 0n
  const gains = rawGains > 0n && vault && vault.argtValue > 0n ? rawGains : 0n
  // balances de los otros twins (Arbitrum, direcciones verificadas con cast)
  const { data: extras } = useQuery({
    queryKey: ['extraTokens', address],
    queryFn: async () => {
      const arb = clientFor(ARBITRUM_ID)
      return Promise.all(EXTRA_TOKENS.map(async (t) => {
        try {
          return await arb.readContract({ address: t.address, abi: erc20Abi, functionName: 'balanceOf', args: [address as `0x${string}`] })
        } catch { return 0n }
      }))
    },
    enabled: !!address,
    refetchInterval: 30_000,
  })

  const health = loop && loop.debtUsdc > 0n ? Number(loop.healthWad) / 1e18 : null
  const riesgo = health === null ? 'Bajo' : health > 1.5 ? 'Moderado' : health > 1.15 ? 'Alto' : 'Crítico'
  const riesgoClass = health === null ? 'health-good' : health > 1.5 ? '' : health > 1.15 ? 'health-warn' : 'health-bad'
  const pedaleando = loopArgt > 0n || vaultArgt > 0n

  return (
    <div className="screen">
      <div className="greet">
        <h1>Hola, viajero 👋</h1>
        <p>{pedaleando ? 'Tu Carrybike está pedaleando.' : 'Tu Carrybike está lista para pedalear.'}</p>
      </div>

      <div className="balance-label" style={{ marginTop: 18 }}>Total en pesos</div>
      <div className="balance" style={{ fontSize: 'clamp(44px,12vw,60px)' }}>
        <span className="cur">$</span>{fmtMoney(total)}
      </div>

      <div className="pos-card">
        <h3>Tu posición activa</h3>
        <div className="pos-grid">
          <div className="cell">
            <div className="k">Capital trabajando</div>
            <div className="v">${fmtArgt(working)}</div>
          </div>
          <div className="cell">
            <div className="k">Ganancia acumulada</div>
            <div className="v gain">+${fmtArgt(gains)}</div>
          </div>
          <div className="cell">
            <div className="k">Riesgo</div>
            <div className={`v ${riesgoClass}`} style={health === null ? { color: 'var(--lime)' } : undefined}>{riesgo}</div>
          </div>
        </div>
        <button className="pos-cta" onClick={() => go('earn')}>
          <span>Ver posición y rendimiento</span> <Chevron />
        </button>
      </div>

      <div className="trust">
        <div className="icircle"><IconShield /></div>
        <div style={{ flex: 1 }}>
          <b>Tus fondos son tuyos</b>
          <p>CarryFi es non-custodial. Vos mantenés el control de tu wallet y de tus claves.</p>
          <button className="how" onClick={() => go('menu')}><span>¿Cómo funciona?</span> <Chevron w={16} /></button>
        </div>
      </div>

      <div className="tokens">
        <h3>Mis tokens</h3>
        <div className="trow">
          <div className="l"><b>ARGt</b><span>Argentine Peso token</span></div>
          <div className="r"><b>{fmtArgt(walletArgt)}</b><span>{sel === 0 ? `en ${CHAIN_IDS.filter((id) => (balances?.[id] ?? 0n) > 0n).length || 3} redes` : CHAINS[sel].name}</span></div>
        </div>
        {EXTRA_TOKENS.map((t, i) => (
          <div className="trow" key={t.symbol}>
            <div className="l"><b>{t.symbol}</b><span>{t.name}</span></div>
            <div className="r"><b>{extras ? fmtArgt(extras[i]) : '…'}</b><span>Arbitrum</span></div>
          </div>
        ))}
        {vaultArgt > 0n && (
          <div className="trow">
            <div className="l"><b>sARGt</b><span>ARGt Prime (rindiendo)</span></div>
            <div className="r"><b>{fmtArgt(vaultArgt)}</b><span>en el vault</span></div>
          </div>
        )}
      </div>

      {balances && walletArgt > 0n && sel === 0 && (
        <div className="card" style={{ background: '#fff' }}>
          <h3>Por red</h3>
          {CHAIN_IDS.map((id) => (
            <div className="row" key={id}>
              <span className="k">{CHAINS[id].name}</span>
              <span className="v">${fmtArgt(balances[id])}</span>
            </div>
          ))}
        </div>
      )}

      <div className="actions">
        <button className="btn primary" onClick={() => go('send')}>Enviar <span>↗</span></button>
        <button className="btn ghost" onClick={() => go('bridge')}>Bridge <span>⇄</span></button>
        <button className="btn ghost wide" style={{ minHeight: 58 }} onClick={() => go('receive')}>Recibir <span>↘</span></button>
      </div>
    </div>
  )
}
