// Direcciones verificadas on-chain el 20/8/2026 con `cast call` (ver AGENTS.md).
// REGLA: ninguna dirección vive fuera de este archivo.
import type { Address } from 'viem'

export const ARBITRUM_ID = 42161
export const BASE_ID = 8453
export const POLYGON_ID = 137
export type ChainId = typeof ARBITRUM_ID | typeof BASE_ID | typeof POLYGON_ID

export interface ChainInfo {
  id: ChainId
  name: string
  eid: number // LayerZero V2 endpoint id
  argt: Address
  oftAdapter: Address
  rpcs: string[]
  explorer: string
  nativeSymbol: string
}

export const CHAINS: Record<ChainId, ChainInfo> = {
  [ARBITRUM_ID]: {
    id: ARBITRUM_ID,
    name: 'Arbitrum',
    eid: 30110,
    argt: '0x59863989d080B22476DB95656d0C3CC18be92214',
    oftAdapter: '0x4821FBf47B261F0D52Ba0F941CF67b8648f82691',
    rpcs: ['https://arb1.arbitrum.io/rpc', 'https://arbitrum-one-rpc.publicnode.com'],
    explorer: 'https://arbiscan.io',
    nativeSymbol: 'ETH',
  },
  [BASE_ID]: {
    id: BASE_ID,
    name: 'Base',
    eid: 30184,
    argt: '0xf016413834E6D1A14F3D628B11D6Ef725a6bdbDD',
    oftAdapter: '0xe80Af1d12426dB4394b147e04f179a38e7C5Dfe7',
    rpcs: ['https://mainnet.base.org', 'https://base-rpc.publicnode.com'],
    explorer: 'https://basescan.org',
    nativeSymbol: 'ETH',
  },
  [POLYGON_ID]: {
    id: POLYGON_ID,
    name: 'Polygon',
    eid: 30109,
    // OJO: polygon-rpc.com devuelve 401 (trampa #6)
    argt: '0x50464bE58912745447E24EB3bbDedcee10D3E056',
    oftAdapter: '0xD70ad085684b2A9f4B5d54D7BDB2ecA37a273216',
    rpcs: ['https://1rpc.io/matic', 'https://polygon-bor-rpc.publicnode.com'],
    explorer: 'https://polygonscan.com',
    nativeSymbol: 'POL',
  },
}

export const CHAIN_IDS: ChainId[] = [ARBITRUM_ID, BASE_ID, POLYGON_ID]

// ── Arbitrum: vault + morpho + loop ─────────────────────────
export const VAULT_ARGT_PRIME: Address = '0x9Dd3F844747AB78d616BF76DB92756E17A064aDD' // sARGt
export const MORPHO: Address = '0x6c247b1F6182318877311737BaC0844bAa518F5e'
export const IRM_ADAPTIVE_CURVE: Address = '0x66F30587FB8D4206918deb78ecA7d5eBbafD06DA'
export const ORACLE_ARGT_USDC: Address = '0xc67F9A01554Dcc0AB415D267b3B3252eEB03aC4F' // 1e48
export const USDC_ARBITRUM: Address = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
export const LLTV_77 = 770000000000000000n // 0.77e18

// market de referencia existente (colateral USDC → presta ARGt) para leer la tasa del carry
export const MARKET_ARGT_USDC_ID = '0xccc7e92a5331c8bb1a1639b8f2afd0521095768e30a9c82d102574ca97bc32be' as const

// contratos nuestros (post-deploy; vacíos ⇒ la UI gatea el Loop con el motivo)
export const CARRY_LOOP = (import.meta.env.VITE_CARRY_LOOP ?? '') as Address | ''
export const SARGT_ORACLE = (import.meta.env.VITE_SARGT_ORACLE ?? '') as Address | ''

export const SHARED_DECIMALS_UNIT = 1_000_000_000_000n // 1e12: floor obligatorio del bridge (trampa #3)

// Otros twins en Arbitrum — verificados con cast (symbol/decimals) el 20/8/2026.
export const EXTRA_TOKENS: { symbol: string; name: string; address: Address }[] = [
  { symbol: 'BRAt', name: 'Brazilian Real token', address: '0xC4ed6Aba5373D78E160F4df39e011F078Be54df8' },
  { symbol: 'PERt', name: 'Peruvian Sol token', address: '0x899438713f62B04d6CD8e8709986F7256fB6E3d9' },
]

// Tokens transaccionables (Enviar). Todas 18 dec. Direcciones verificadas on-chain en las
// 3 chains — OJO: la tabla de las capturas tenía la de BRAt/Polygon mal (mostraba la de ARGt).
export interface Token { symbol: string; name: string; byChain: Partial<Record<ChainId, Address>> }
export const TOKENS: Token[] = [
  {
    symbol: 'ARGt', name: 'Argentine Peso token',
    byChain: { [ARBITRUM_ID]: CHAINS[ARBITRUM_ID].argt, [BASE_ID]: CHAINS[BASE_ID].argt, [POLYGON_ID]: CHAINS[POLYGON_ID].argt },
  },
  {
    symbol: 'BRAt', name: 'Brazilian Real token',
    byChain: {
      [ARBITRUM_ID]: '0xC4ed6Aba5373D78E160F4df39e011F078Be54df8',
      [BASE_ID]: '0xFEE29845569570F8e0119291dff77B7b93283aaB',
      [POLYGON_ID]: '0x59863989d080B22476DB95656d0C3CC18be92214',
    },
  },
]
