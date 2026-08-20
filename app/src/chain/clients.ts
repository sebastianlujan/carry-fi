import { createPublicClient, fallback, http } from 'viem'
import { arbitrum, base, polygon } from 'viem/chains'
import { CHAINS, type ChainId, ARBITRUM_ID, BASE_ID, POLYGON_ID } from './registry'

export const VIEM_CHAINS = { [ARBITRUM_ID]: arbitrum, [BASE_ID]: base, [POLYGON_ID]: polygon } as const

const make = (id: ChainId) =>
  createPublicClient({
    chain: VIEM_CHAINS[id],
    transport: fallback(CHAINS[id].rpcs.map((u) => http(u, { timeout: 8_000 }))),
  })

export type Client = ReturnType<typeof make>
const cache = new Map<ChainId, Client>()
export function clientFor(id: ChainId): Client {
  let c = cache.get(id)
  if (!c) { c = make(id); cache.set(id, c) }
  return c
}
