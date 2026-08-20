#!/usr/bin/env bash
# Carry — idempotent project bootstrap
set -euo pipefail
cd "$(dirname "$0")"

say(){ printf "\033[1;92m[init]\033[0m %s\n" "$*"; }
die(){ printf "\033[1;31m[init] FALTA: %s\033[0m\n" "$*"; exit 1; }

# ── toolchain ────────────────────────────────────────────────
command -v node  >/dev/null || die "node (>=20)"
command -v pnpm  >/dev/null || die "pnpm"
command -v forge >/dev/null || die "foundry (curl -L https://foundry.paradigm.xyz | bash)"
say "toolchain ok: node $(node -v), pnpm $(pnpm -v), $(forge --version | head -1)"

# ── contracts (Foundry) ──────────────────────────────────────
if [ ! -f contracts/foundry.toml ]; then
  say "scaffolding contracts/ (foundry)"
  forge init contracts --no-git
  rm -f contracts/src/Counter.sol contracts/test/Counter.t.sol contracts/script/Counter.s.sol
else
  say "contracts/ ya existe"
fi

# ── app (Vite + React + TS) ─────────────────────────────────
if [ ! -f app/package.json ]; then
  say "scaffolding app/ (vite react-ts)"
  pnpm create vite app --template react-ts
fi
say "instalando deps de app/"
( cd app && pnpm add viem @privy-io/react-auth @tanstack/react-query >/dev/null && pnpm install >/dev/null )

# ── env ──────────────────────────────────────────────────────
if [ ! -f app/.env.example ]; then
  cat > app/.env.example <<'ENV'
# Privy app id (dashboard.privy.io) — habilitar Arbitrum, Base, Polygon
VITE_PRIVY_APP_ID=
# fallback sin Privy: VITE_WALLET=burner genera una key local en el device
VITE_WALLET=privy
# opcional: CarryLoop deployado (si está, la pantalla Loop lo usa)
VITE_CARRY_LOOP=
VITE_SARGT_ORACLE=
ENV
fi
[ -f app/.env ] || cp app/.env.example app/.env

say "listo. próximos pasos:"
say "  1) completar VITE_PRIVY_APP_ID en app/.env"
say "  2) cd contracts && forge test --fork-url https://arb1.arbitrum.io/rpc"
say "  3) cd app && pnpm dev"
