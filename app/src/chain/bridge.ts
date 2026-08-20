// Milestone 3 — bridge = LayerZero V2 OFT Adapter (verificado por selectores + peers).
import type { Address } from 'viem'
import { pad } from 'viem'
import { clientFor } from './clients'
import { oftAbi, erc20Abi } from './abis'
import { CHAINS, SHARED_DECIMALS_UNIT, type ChainId } from './registry'

// TRAMPA #3: sharedDecimals=6 ⇒ floor a múltiplos de 1e12; ese floored es el minAmountLD.
export function floorToShared(amount: bigint): bigint {
  return (amount / SHARED_DECIMALS_UNIT) * SHARED_DECIMALS_UNIT
}

export function sendParam(dst: ChainId, to: Address, amount: bigint) {
  const amt = floorToShared(amount)
  return {
    dstEid: CHAINS[dst].eid,
    to: pad(to, { size: 32 }),
    amountLD: amt,
    minAmountLD: amt,
    extraOptions: '0x' as const, // TRAMPA #4: enforcedOptions ya trae 300k gas
    composeMsg: '0x' as const,
    oftCmd: '0x' as const,
  }
}

export async function quoteBridge(src: ChainId, dst: ChainId, to: Address, amount: bigint): Promise<bigint> {
  const fee = await clientFor(src).readContract({
    address: CHAINS[src].oftAdapter, abi: oftAbi, functionName: 'quoteSend',
    args: [sendParam(dst, to, amount), false],
  })
  return fee.nativeFee
}

export async function argtBalance(chain: ChainId, user: Address): Promise<bigint> {
  return clientFor(chain).readContract({ address: CHAINS[chain].argt, abi: erc20Abi, functionName: 'balanceOf', args: [user] })
}

export async function allBalances(user: Address): Promise<Record<ChainId, bigint>> {
  const ids = Object.keys(CHAINS).map(Number) as ChainId[]
  const vals = await Promise.all(ids.map(async (id) => {
    try { return await argtBalance(id, user) } catch { return 0n }
  }))
  return Object.fromEntries(ids.map((id, i) => [id, vals[i]])) as Record<ChainId, bigint>
}
