import { useQuery } from '@tanstack/react-query'
import { useWallet } from '../wallet'
import { useBalances, useVaultPosition, useLoopPosition } from '../hooks'
import { fmtMoney, fmtArgt } from '../chain/format'
import { CHAINS, CHAIN_IDS, ARBITRUM_ID } from '../chain/registry'
import { argtToUsdc } from '../chain/loop'
import type { Screen } from '../App'

export default function Home({ go }: { go: (s: Screen) => void }) {
  const { address } = useWallet()
  const { data: balances } = useBalances(address)
  const { data: vault } = useVaultPosition(address)
  const { data: loop } = useLoopPosition(address)

  const walletArgt = balances ? CHAIN_IDS.reduce((a, id) => a + balances[id], 0n) : 0n
  const vaultArgt = vault?.argtValue ?? 0n
  const loopArgt = loop?.collateralArgt ?? 0n
  const debtUsdc = loop?.debtUsdc ?? 0n

  // deuda del loop expresada en ARGt para el total (feed real)
  const { data: debtArgt } = useQuery({
    queryKey: ['debtArgt', debtUsdc.toString()],
    queryFn: async () => {
      if (debtUsdc === 0n) return 0n
      const oneArgtInUsdc = await argtToUsdc(10n ** 18n) // USDC por 1 ARGt
      return oneArgtInUsdc === 0n ? 0n : (debtUsdc * 10n ** 18n) / oneArgtInUsdc
    },
  })

  const total = walletArgt + vaultArgt + loopArgt - (debtArgt ?? 0n)
  const health = loop && loop.debtUsdc > 0n ? Number(loop.healthWad) / 1e18 : null

  return (
    <div className="screen">
      <div className="balance-label">Total en pesos</div>
      <div className="balance"><span className="cur">$</span>{fmtMoney(total)}</div>
      <div className="sub">ARGt en {CHAIN_IDS.filter((id) => (balances?.[id] ?? 0n) > 0n).length || '3'} redes · non-custodial</div>

      <div className="card">
        <h3>Posiciones</h3>
        <div className="row"><span className="k">Disponible</span><span className="v">${fmtArgt(walletArgt)}</span></div>
        <div className="row"><span className="k">Rindiendo (vault)</span><span className="v">${fmtArgt(vaultArgt)}</span></div>
        {loopArgt > 0n && (
          <div className="row"><span className="k">Loop (colateral)</span><span className="v">${fmtArgt(loopArgt)}</span></div>
        )}
        {debtUsdc > 0n && (
          <div className="row"><span className="k">Deuda USDC</span><span className="v">−{(Number(debtUsdc) / 1e6).toFixed(2)} US$</span></div>
        )}
        {health !== null && (
          <div className="row">
            <span className="k">Salud</span>
            <span className={`v ${health > 1.5 ? 'health-good' : health > 1.15 ? 'health-warn' : 'health-bad'}`}>
              {health.toFixed(2)}
            </span>
          </div>
        )}
        {balances && (
          <>
            <hr className="divider" />
            {CHAIN_IDS.map((id) => (
              <div className="row" key={id}>
                <span className="k">{CHAINS[id].name}</span>
                <span className="v">${fmtArgt(balances[id])}</span>
              </div>
            ))}
          </>
        )}
      </div>

      <div className="actions">
        <button className="btn primary" onClick={() => go('send')}>Enviar <span>↗</span></button>
        <button className="btn ghost" onClick={() => go('bridge')}>Bridge <span>⇄</span></button>
      </div>
    </div>
  )
}
// nota: ARBITRUM_ID queda importado para futuros usos de deep-link por red
void ARBITRUM_ID
