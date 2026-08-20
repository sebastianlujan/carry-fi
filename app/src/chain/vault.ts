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
