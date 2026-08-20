# Carry — repo contract

Non-custodial Payy-style wallet on Twin Stablecoins (ARGt) with a leveraged carry-trade
loop. Monorepo: `contracts/` (Foundry) + `app/` (Vite + React 19 + TS + viem + Privy).

## Commands
```bash
./init.sh                                                  # idempotent bootstrap
cd contracts && forge test --fork-url $ARBITRUM_RPC -vv    # tests (Arbitrum fork)
cd app && pnpm exec tsc --noEmit && pnpm build             # typecheck + build
cd app && pnpm dev                                         # dev server
```

## Verified addresses (Arbitrum 42161) — do NOT edit without re-verifying via `cast call`
| What | Address |
|---|---|
| ARGt | `0x59863989d080B22476DB95656d0C3CC18be92214` |
| ARGt Prime vault (sARGt, Morpho Vault V2) | `0x9Dd3F844747AB78d616BF76DB92756E17A064aDD` |
| Morpho Blue | `0x6c247b1F6182318877311737BaC0844bAa518F5e` |
| AdaptiveCurve IRM | `0x66F30587FB8D4206918deb78ecA7d5eBbafD06DA` |
| ARGt/USDC oracle (1 USDC ≈ 1575 ARGt) | `0xc67F9A01554Dcc0AB415D267b3B3252eEB03aC4F` |
| USDC | `0xaf88d065e77c8cC2239327C5EDb3A432268e5831` |
| ARGt OFT Adapter (LayerZero V2, EID 30110) | `0x4821FBf47B261F0D52Ba0F941CF67b8648f82691` |
| Existing ARGt/USDC market (inverse of ours) | id `0xccc7e92a5331c8bb1a1639b8f2afd0521095768e30a9c82d102574ca97bc32be` |

**Base (8453, EID 30184):** adapter `0xe80Af1d12426dB4394b147e04f179a38e7C5Dfe7`, ARGt `0xf016413834E6D1A14F3D628B11D6Ef725a6bdbDD`
**Polygon (137, EID 30109):** adapter `0xD70ad085684b2A9f4B5d54D7BDB2ecA37a273216`, ARGt `0x50464bE58912745447E24EB3bbDedcee10D3E056`
**LZ Endpoint (all 3 chains):** `0x1a44076050125825900e736c501f859c50fE728c`

Every new address gets verified with `cast call` (name/symbol/token()/peers()) **before**
being committed. In the app, addresses live ONLY in `app/src/chain/registry.ts`; in
contracts, in `contracts/src/Addresses.sol`.

## The 6 traps (verified on-chain; each one breaks something silently)
1. **The vault's `max*()` always return 0** (proven post-deposit on a fork). Never use
   `maxDeposit/maxMint/maxWithdraw/maxRedeem` for validation. Use `balanceOf` + `preview*` + simulate.
2. **ARGt has no EIP-2612** (`DOMAIN_SEPARATOR()` reverts) → everything is approve + action.
   The loop additionally needs a one-time `Morpho.setAuthorization(router, true)`.
3. **The bridge truncates to 6 decimals** (`sharedDecimals=6`): floor amounts to multiples
   of `1e12` and use that floored value as `minAmountLD`, otherwise `SlippageExceeded`.
4. **`extraOptions = 0x`** on the OFT — `enforcedOptions` already carry 300k gas; adding
   your own doubles the cost.
5. **Morpho virtual shares** (`1e6` shares / `1` asset) plus interest accrued since
   `lastUpdate` via `borrowRateView`. Never divide raw `shares/totalShares`.
6. **RPCs**: `polygon-rpc.com` returns 401. Use `1rpc.io/matic`. Failover lives in `clients.ts`.

## Code rules
- `app/src/chain/*` = pure TS, zero React. Hooks in `app/src/hooks.ts`.
- Amounts: always `bigint`. `number` for wei = a bug.
- `simulateContract` before every `writeContract`.
- Contracts: CEI, `forceApprove`, flash-loan callback only callable by Morpho with an
  active pending op, zero funds resting in the router after any tx, position always owned
  by the user.

## Economic reality (measured Aug 20, 2026 — always shown live, never hardcoded)
- Vault realized APY ~0.0065% (curator keeps 99.97% idle). Share price 1.004714.
- Existing ARGt/USDC market: 13.4% supply / 16.1% borrow (83% utilization).
- The loop's sARGt/USDC market **is created by us** (permissionless). ARGt↔USDC DEX
  liquidity **does not exist on any Arbitrum or Base venue** — the fork seeds it; the UI
  checks live and gates the Loop with the exact reason.
