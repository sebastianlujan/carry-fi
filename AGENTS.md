# Carry — contrato del repo

Wallet non-custodial estilo Payy sobre Twin Stablecoins (ARGt) con loop apalancado del
carry argentino. Monorepo: `contracts/` (Foundry) + `app/` (Vite + React 19 + TS + viem + Privy).

## Comandos
```bash
./init.sh                                                  # bootstrap idempotente
cd contracts && forge test --fork-url $ARBITRUM_RPC -vv    # tests (fork Arbitrum)
cd app && pnpm exec tsc --noEmit && pnpm build             # typecheck + build
cd app && pnpm dev                                         # dev server
```

## Direcciones verificadas (Arbitrum 42161) — NO editar sin verificar con `cast call`
| Qué | Dirección |
|---|---|
| ARGt | `0x59863989d080B22476DB95656d0C3CC18be92214` |
| Vault ARGt Prime (sARGt, Morpho Vault V2) | `0x9Dd3F844747AB78d616BF76DB92756E17A064aDD` |
| Morpho Blue | `0x6c247b1F6182318877311737BaC0844bAa518F5e` |
| IRM AdaptiveCurve | `0x66F30587FB8D4206918deb78ecA7d5eBbafD06DA` |
| Oracle ARGt/USDC (1 USDC ≈ 1575 ARGt) | `0xc67F9A01554Dcc0AB415D267b3B3252eEB03aC4F` |
| USDC | `0xaf88d065e77c8cC2239327C5EDb3A432268e5831` |
| OFT Adapter ARGt (LayerZero V2, EID 30110) | `0x4821FBf47B261F0D52Ba0F941CF67b8648f82691` |
| Market ARGt/USDC existente (inverso al nuestro) | id `0xccc7e92a5331c8bb1a1639b8f2afd0521095768e30a9c82d102574ca97bc32be` |

**Base (8453, EID 30184):** adapter `0xe80Af1d12426dB4394b147e04f179a38e7C5Dfe7`, ARGt `0xf016413834E6D1A14F3D628B11D6Ef725a6bdbDD`
**Polygon (137, EID 30109):** adapter `0xD70ad085684b2A9f4B5d54D7BDB2ecA37a273216`, ARGt `0x50464bE58912745447E24EB3bbDedcee10D3E056`
**LZ Endpoint (las 3 chains):** `0x1a44076050125825900e736c501f859c50fE728c`

Toda dirección nueva se verifica con `cast call` (name/symbol/token()/peers()) **antes** de commitear.
En la app, las direcciones viven SOLO en `app/src/chain/registry.ts`; en contratos, en `contracts/src/Addresses.sol`.

## Las 6 trampas (verificadas on-chain; cada una rompe algo en silencio)
1. **`max*` devuelve 0 siempre** en el vault (probado post-depósito en fork). Prohibido
   `maxDeposit/maxMint/maxWithdraw/maxRedeem` para validar. Usar `balanceOf` + `preview*` + simulate.
2. **ARGt no tiene EIP-2612** (`DOMAIN_SEPARATOR()` revierte) → todo es approve + acción.
   El loop requiere además `Morpho.setAuthorization(router, true)` una única vez.
3. **Bridge trunca a 6 decimales** (`sharedDecimals=6`): floor del monto a múltiplos de `1e12`
   y ese floored como `minAmountLD`, si no `SlippageExceeded`.
4. **`extraOptions = 0x`** en el OFT — ya hay 300k gas en `enforcedOptions`; duplicar encarece.
5. **Morpho virtual shares** (`1e6` shares / `1` asset) + interés desde `lastUpdate` con
   `borrowRateView`. Nunca `shares/totalShares` a pelo.
6. **RPCs**: `polygon-rpc.com` devuelve 401. Usar `1rpc.io/matic`. Failover en `clients.ts`.

## Reglas de código
- `app/src/chain/*` = TS puro, cero React. Hooks en `app/src/hooks/`.
- Montos: `bigint` siempre. `number` para wei = bug.
- `simulateContract` antes de cada `writeContract`.
- Contratos: CEI, `forceApprove`, callback de flashloan sólo desde Morpho con contexto activo,
  cero fondos en reposo en el router al final de cada tx, posición siempre a nombre del user.

## Realidad económica (medida 20/8/2026 — mostrar live, jamás hardcodear)
- Vault APY realizado ~0,0065% (curator 99,97% idle). Share price 1.004714.
- Market ARGt/USDC existente: supply 13,36% / borrow 16,10% (util 83%).
- El market sARGt/USDC del loop **lo creamos nosotros** (permissionless). La liquidez DEX
  ARGt↔USDC **no existe en ningún venue** de Arbitrum ni Base — el fork la seedea; la UI
  chequea en vivo y gatea el Loop con el motivo exacto.
