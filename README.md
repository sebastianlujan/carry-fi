# Carry — pesos that earn

**A non-custodial, Payy-style wallet for ARGt (Twin Stablecoins) with the Argentine peso
carry trade as the product: real Morpho yield, LayerZero bridging, and an atomic leveraged
loop built on flash loans.**

🟢 **Live**: https://carry-predictumx.vercel.app
🚲 Logo: *la bicicleta* — "la bicicleta financiera" is the lifelong Argentine name for
exactly this trade.
📱 Mobile-first — open it on your phone.

---

## What it is

Argentines hold pesos that melt. On the other side, people pay **16% APY** to borrow those
pesos against dollar collateral (to short them). Carry puts the user on the side that
collects — in a wallet UI, not a DeFi dashboard:

- **Wallet** — aggregated ARGt balance across Arbitrum + Base + Polygon, 2-step send.
- **Earn** — the **ARGt Prime** vault (ERC-4626 / Morpho Vault V2) with live share price
  and the live carry rate. *Milestone 2 ✓*
- **Bridge** — LayerZero V2 OFT across the 3 chains, live fee quotes, 6-decimal dust
  handling. *Milestone 3 ✓*
- **Loop** — leveraged carry: flash-loan USDC → swap → deposit into the vault → shares
  posted as Morpho collateral **owned by the user** → USDC debt repays the flash. One
  transaction in, one out. Gated behind an explicit risk threshold with consequences
  spelled out before signing.

## Non-custodial, for real

- Privy embedded wallets (keys on-device, MPC) — with a local burner fallback.
- **Zero backend**: the app is a static build; everything happens browser ↔ chain.
- The loop and vault positions live **under the user's own address** on-chain: if Carry
  disappears, you exit through Morpho and the vault directly.

## Honesty as a feature

Every number in the UI comes from live on-chain reads (IRM rates, share price,
utilization). The loop is currently **not executable on mainnet** and the UI says so with
the exact reason: there is no ARGt/USDC DEX liquidity on any Arbitrum venue (verified).
The full machine is proven in fork tests against the real contracts.

## Run it

```bash
./init.sh                      # bootstrap (foundry + pnpm)
cd contracts && forge test --fork-url https://arb1.arbitrum.io/rpc -vv   # 10 tests on a real fork
cd app && pnpm dev             # set VITE_PRIVY_APP_ID in app/.env (otherwise burner mode)
```

## Contracts (`contracts/`)

| Contract | What it does |
|---|---|
| `CarryLoop.sol` | atomic leverage/deleverage via `Morpho.flashLoan` (fee 0). Position owned by the user; performance fee only on profit, immutable 20% cap |
| `SArgtOracle.sol` | sARGt/USDC price composing Twin's real feed × the vault's `convertToAssets` |
| `swappers/` | pluggable `ISwapper`: `UniV3Swapper` (production) + `SeededSwapper` (fork — the liquidity leg that doesn't exist yet) |
| `script/DeployLoop.s.sol` | real Arbitrum deploy: oracle + `createMarket(sARGt/USDC, 77% LLTV)` — permissionless, gas only |

**Tests (Arbitrum fork, 10/10):** end-to-end loop at k=2 (health 1.54 → 7 days of real
interest → full close), fee-on-profit math, guards (`VaultIlliquid`, authorization),
milestone 2 (vault deposit/redeem plus proof that `maxDeposit()==0` lies), milestone 3
(bridge quote/send plus dust flooring).

## On-chain research findings (Aug 20, 2026)

1. The ARGt Prime vault is a synchronous, ungated **Morpho Vault V2** — but its `max*()`
   functions **always return 0**: validating with them breaks 100% of operations.
2. Twin's "bridge" is a standard **LayerZero V2 OFT Adapter** (peers verified).
3. ARGt has **no permit** (EIP-2612) — hence the router.
4. The loop's market (sARGt collateral → USDC debt) **did not exist: we create it** —
   `createMarket` is permissionless.
5. The carry is real: **13.4% supply / 16.1% borrow** (83% utilization) on Morpho's
   ARGt/USDC market — read live by the app.

## Stack

TypeScript · React 19 · Vite · viem · Privy · TanStack Query · Foundry · Solidity 0.8.28

## Addresses (Arbitrum)

See `AGENTS.md` — every address verified with `cast call` before use.
