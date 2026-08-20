// El loop: netAPY(k), salud, precio de liquidación. Inputs SIEMPRE live, jamás hardcodeados.
import type { Address } from 'viem'
import { clientFor } from './clients'
import { marketExists } from './morpho'
import { carryLoopAbi, oracleAbi } from './abis'
import { CARRY_LOOP, ORACLE_ARGT_USDC, ARBITRUM_ID } from './registry'

export const LLTV = 0.77

/// netAPY(k) = k·vaultApy − (k−1)·borrowApy − costos swap amortizados (ida+vuelta sobre (k−1))
export function netApy(k: number, vaultApy: number, borrowApy: number, swapCostBps = 30, horizonYears = 1): number {
  const swapDrag = (2 * (k - 1) * (swapCostBps / 10_000)) / horizonYears
  return k * vaultApy - (k - 1) * borrowApy - swapDrag
}

/// salud inicial = k·LLTV/(k−1); caída de ARGt que liquida = 1 − (k−1)/(k·LLTV)
export function healthAt(k: number): number {
  return k <= 1 ? Infinity : (k * LLTV) / (k - 1)
}
export function liquidationDrop(k: number): number {
  return k <= 1 ? 1 : 1 - (k - 1) / (k * LLTV)
}

export interface LoopPosition {
  collateralShares: bigint
  collateralArgt: bigint
  debtUsdc: bigint
  healthWad: bigint
}

export async function loopPosition(user: Address): Promise<LoopPosition | null> {
  if (!CARRY_LOOP) return null
  const [collateralShares, collateralArgt, debtUsdc, healthWad] = await clientFor(ARBITRUM_ID).readContract({
    address: CARRY_LOOP, abi: carryLoopAbi, functionName: 'positionOf', args: [user],
  })
  return { collateralShares, collateralArgt, debtUsdc, healthWad }
}

/// USDC (6d) que vale un monto de ARGt según el feed real (1e48: ARGt por USDC).
export async function argtToUsdc(argt: bigint): Promise<bigint> {
  const p = await clientFor(ARBITRUM_ID).readContract({ address: ORACLE_ARGT_USDC, abi: oracleAbi, functionName: 'price' })
  return (argt * 10n ** 36n) / p
}

export interface LoopChecks {
  deployed: boolean
  marketLive: boolean
  reason: string | null
}

export async function loopChecks(): Promise<LoopChecks> {
  if (!CARRY_LOOP) {
    return {
      deployed: false, marketLive: false,
      reason: 'El market sARGt/USDC y el router aún no están deployados en mainnet. La máquina está probada en fork (contracts/test/LoopFork.t.sol) — falta liquidez DEX ARGt/USDC en Arbitrum, hoy inexistente en todos los venues.',
    }
  }
  try {
    const id = await clientFor(ARBITRUM_ID).readContract({ address: CARRY_LOOP, abi: carryLoopAbi, functionName: 'MARKET_ID' })
    const live = await marketExists(id)
    return { deployed: true, marketLive: live, reason: live ? null : 'El market sARGt/USDC no responde on-chain.' }
  } catch {
    return { deployed: true, marketLive: false, reason: 'No se pudo verificar el market on-chain.' }
  }
}
