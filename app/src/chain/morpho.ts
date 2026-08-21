// Tasas reales del carry: market ARGt/USDC existente en Morpho Blue (Arbitrum).
import { clientFor } from './clients'
import { morphoAbi, irmAbi } from './abis'
import type { Address } from 'viem'
import { MORPHO, IRM_ADAPTIVE_CURVE, MARKET_ARGT_USDC_ID, ARBITRUM_ID } from './registry'

const SECONDS_PER_YEAR = 31_536_000

export interface MarketRates {
  supplyApy: number
  borrowApy: number
  utilization: number
  totalSupplyAssets: bigint
  totalBorrowAssets: bigint
}

export async function marketRates(marketId: `0x${string}` = MARKET_ARGT_USDC_ID): Promise<MarketRates> {
  const arb = clientFor(ARBITRUM_ID)
  const m = await arb.readContract({ address: MORPHO, abi: morphoAbi, functionName: 'market', args: [marketId] })
  const [tsa, , tba] = [m[0], m[1], m[2]]
  const params = await arb.readContract({ address: MORPHO, abi: morphoAbi, functionName: 'idToMarketParams', args: [marketId] })
  const ratePerSec = await arb.readContract({
    address: IRM_ADAPTIVE_CURVE, abi: irmAbi, functionName: 'borrowRateView',
    args: [
      { loanToken: params[0], collateralToken: params[1], oracle: params[2], irm: params[3], lltv: params[4] },
      { totalSupplyAssets: m[0], totalSupplyShares: m[1], totalBorrowAssets: m[2], totalBorrowShares: m[3], lastUpdate: m[4], fee: m[5] },
    ],
  })
  const r = Number(ratePerSec) / 1e18
  const borrowApy = Math.expm1(r * SECONDS_PER_YEAR)
  const utilization = tsa === 0n ? 0 : Number((tba * 10_000n) / tsa) / 10_000
  return { supplyApy: borrowApy * utilization, borrowApy, utilization, totalSupplyAssets: tsa, totalBorrowAssets: tba }
}

export async function marketExists(marketId: `0x${string}`): Promise<boolean> {
  const m = await clientFor(ARBITRUM_ID).readContract({ address: MORPHO, abi: morphoAbi, functionName: 'market', args: [marketId] })
  return m[4] > 0n // lastUpdate > 0
}

// Virtual shares de Morpho (trampa #5): assets = shares·(totalAssets+1)/(totalShares+1e6).
const VIRTUAL_SHARES = 1_000_000n
const VIRTUAL_ASSETS = 1n

// Posición de SUPPLY del user en el market ARGt/USDC: cuánto ARGt tiene puesto a rendir.
export async function marketSupplyPosition(user: Address, marketId: `0x${string}` = MARKET_ARGT_USDC_ID): Promise<{ shares: bigint; assets: bigint }> {
  const arb = clientFor(ARBITRUM_ID)
  const [pos, m] = await Promise.all([
    arb.readContract({ address: MORPHO, abi: morphoAbi, functionName: 'position', args: [marketId, user] }),
    arb.readContract({ address: MORPHO, abi: morphoAbi, functionName: 'market', args: [marketId] }),
  ])
  const shares = pos[0] // supplyShares
  const totalAssets = m[0]
  const totalShares = m[1]
  const assets = shares === 0n ? 0n : (shares * (totalAssets + VIRTUAL_ASSETS)) / (totalShares + VIRTUAL_SHARES)
  return { shares, assets }
}
