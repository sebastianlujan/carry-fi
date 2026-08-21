// Actividad REAL: Transfer events de ARGt on-chain (enviados/recibidos por el usuario).
// Sin backend, sin mock. Arbitrum trae historia amplia; Base/Polygon best-effort (sus RPCs
// públicos limitan getLogs) y se saltean si fallan. Timestamps aproximados por block time.
import { parseAbiItem, type Address } from 'viem'
import { createPublicClient, http, type Chain } from 'viem'
import { arbitrum, base, polygon } from 'viem/chains'
import { CHAINS, VAULT_ARGT_PRIME, ARBITRUM_ID, BASE_ID, POLYGON_ID, type ChainId } from './registry'

const TRANSFER = parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)')

// RPC + rango + block time por chain (los que sirven getLogs)
const SRC: Partial<Record<ChainId, { rpc: string; chain: Chain; range: bigint; blockSec: number }>> = {
  [ARBITRUM_ID]: { rpc: 'https://arb1.arbitrum.io/rpc', chain: arbitrum, range: 4_000_000n, blockSec: 0.25 },
  [POLYGON_ID]: { rpc: 'https://polygon-bor-rpc.publicnode.com', chain: polygon, range: 45_000n, blockSec: 2.1 },
  [BASE_ID]: { rpc: 'https://base-rpc.publicnode.com', chain: base, range: 40_000n, blockSec: 2 },
}

export type TxKind = 'send' | 'receive' | 'vault-in' | 'vault-out'
export interface Tx {
  chain: ChainId
  hash: `0x${string}`
  logIndex: number
  block: bigint
  dir: 'in' | 'out'
  kind: TxKind
  counterparty: Address
  value: bigint
  ts: number // ms, aproximado
}

async function fetchChain(id: ChainId, user: Address): Promise<Tx[]> {
  const s = SRC[id]
  if (!s) return []
  const c = createPublicClient({ chain: s.chain, transport: http(s.rpc, { timeout: 9_000 }) })
  const latest = await c.getBlockNumber()
  const fromBlock = latest > s.range ? latest - s.range : 0n
  const argt = CHAINS[id].argt
  const [latestBlk, sent, recv] = await Promise.all([
    c.getBlock({ blockNumber: latest }),
    c.getLogs({ address: argt, event: TRANSFER, args: { from: user }, fromBlock, toBlock: latest }),
    c.getLogs({ address: argt, event: TRANSFER, args: { to: user }, fromBlock, toBlock: latest }),
  ])
  const latestTs = Number(latestBlk.timestamp) * 1000
  const map = (logs: typeof sent, dir: 'in' | 'out'): Tx[] =>
    logs.map((l) => {
      const cp = (dir === 'out' ? l.args.to : l.args.from) as Address
      const isVault = cp?.toLowerCase() === VAULT_ARGT_PRIME.toLowerCase()
      const kind: TxKind = isVault ? (dir === 'out' ? 'vault-in' : 'vault-out') : (dir === 'out' ? 'send' : 'receive')
      return {
        chain: id, hash: l.transactionHash!, logIndex: l.logIndex ?? 0, block: l.blockNumber!,
        dir, kind, counterparty: cp, value: (l.args.value ?? 0n) as bigint,
        ts: latestTs - Number(latest - l.blockNumber!) * s.blockSec * 1000,
      }
    })
  return [...map(sent, 'out'), ...map(recv, 'in')]
}

export async function fetchActivity(user: Address): Promise<Tx[]> {
  const ids = (Object.keys(SRC).map(Number) as ChainId[])
  const results = await Promise.all(ids.map((id) => fetchChain(id, user).catch(() => [] as Tx[])))
  const seen = new Set<string>()
  return results
    .flat()
    .filter((t) => { const k = `${t.hash}:${t.logIndex}`; if (seen.has(k)) return false; seen.add(k); return true })
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 40)
}

export function relTime(ts: number): string {
  const s = Math.max(0, (Date.now() - ts) / 1000)
  if (s < 90) return 'recién'
  const m = s / 60; if (m < 60) return `hace ${Math.round(m)} min`
  const h = m / 60; if (h < 24) return `hace ${Math.round(h)} h`
  const d = h / 24; if (d < 30) return `hace ${Math.round(d)} d`
  return `hace ${Math.round(d / 30)} mes`
}
