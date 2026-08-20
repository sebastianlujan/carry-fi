# Carry — app

Static, non-custodial frontend. Vite + React 19 + TypeScript + viem + Privy + TanStack Query.

```bash
pnpm install
pnpm dev            # set VITE_PRIVY_APP_ID in .env (otherwise burner-wallet mode)
pnpm build          # static build → dist/
pnpm exec tsc --noEmit
```

Layout rule: `src/chain/*` is pure TypeScript (no React) — registry, viem clients with RPC
failover, vault/bridge/morpho/loop logic. React hooks live in `src/hooks.ts`; screens in
`src/screens/`. Every address lives in `src/chain/registry.ts` only. Amounts are `bigint`
end-to-end and every write is `simulateContract`-ed before signing.
