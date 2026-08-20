// Milestone 2 — vault ARGt Prime (Morpho Vault V2, síncrono).
// TRAMPA #1: jamás max*() para validar; balanceOf + preview* + simulate.
import type { Address } from 'viem'
import { clientFor } from './clients'
import { vaultAbi, erc20Abi } from './abis'
import { VAULT_ARGT_PRIME, CHAINS, ARBITRUM_ID } from './registry'

const ARGT = CHAINS[ARBITRUM_ID].argt
const arb = () => clientFor(ARBITRUM_ID)

export async function sharePrice(): Promise<bigint> {
  return arb().readContract({ address: VAULT_ARGT_PRIME, abi: vaultAbi, functionName: 'convertToAssets', args: [10n ** 18n] })
}

export async function vaultPosition(user: Address): Promise<{ shares: bigint; argtValue: bigint }> {
  const shares = await arb().readContract({ address: VAULT_ARGT_PRIME, abi: vaultAbi, functionName: 'balanceOf', args: [user] })
  const argtValue = shares === 0n ? 0n :
    await arb().readContract({ address: VAULT_ARGT_PRIME, abi: vaultAbi, functionName: 'convertToAssets', args: [shares] })
  return { shares, argtValue }
}

export async function previewDeposit(assets: bigint): Promise<bigint> {
  return arb().readContract({ address: VAULT_ARGT_PRIME, abi: vaultAbi, functionName: 'previewDeposit', args: [assets] })
}

export async function vaultIdleArgt(): Promise<bigint> {
  return arb().readContract({ address: ARGT, abi: erc20Abi, functionName: 'balanceOf', args: [VAULT_ARGT_PRIME] })
}

// APY realizado trailing del vault (dos lecturas de share price ~21h). Honesto: es lo que
// el vault DE VERDAD entrega hoy (idle → ~0%). Fallback 0 si el RPC no tiene el archive.
const ARB_BLOCK_SEC = 0.25
export async function vaultRealizedApy(): Promise<number> {
  const c = arb()
  try {
    const latest = await c.getBlockNumber()
    const back = 300_000n // ~21h en Arbitrum
    const from = latest > back ? latest - back : 0n
    const [pNow, pThen] = await Promise.all([
      c.readContract({ address: VAULT_ARGT_PRIME, abi: vaultAbi, functionName: 'convertToAssets', args: [10n ** 18n] }),
      c.readContract({ address: VAULT_ARGT_PRIME, abi: vaultAbi, functionName: 'convertToAssets', args: [10n ** 18n], blockNumber: from }),
    ])
    if (pThen === 0n) return 0
    const dt = Number(back) * ARB_BLOCK_SEC
    const apy = Math.pow(Number(pNow) / Number(pThen), 31_536_000 / dt) - 1
    return Number.isFinite(apy) && apy > 0 ? apy : 0
  } catch {
    return 0
  }
}
