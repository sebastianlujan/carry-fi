# Carry — contracts

Foundry project. Solidity 0.8.28.

```bash
forge build
forge test --fork-url https://arb1.arbitrum.io/rpc -vv     # 10 tests on a real Arbitrum fork
forge script script/DeployLoop.s.sol --rpc-url arbitrum --broadcast -i 1   # real deploy (gas only)
```

- `src/CarryLoop.sol` — atomic leverage/deleverage of the peso carry via `Morpho.flashLoan`.
  User owns the position; router holds nothing between txs; perf fee only on profit (20% cap).
- `src/SArgtOracle.sol` — sARGt/USDC oracle composing Twin's live ARGt/USDC feed with the
  vault share price.
- `src/swappers/` — pluggable `ISwapper`: `UniV3Swapper` (production) and `SeededSwapper`
  (fork tests — stands in for the ARGt/USDC DEX liquidity that does not exist yet).
- `test/` — `LoopFork` (end-to-end loop, fees, guards), `VaultFork` (milestone 2 + proof
  that the vault's `max*()` lie), `BridgeFork` (milestone 3 + dust flooring).
