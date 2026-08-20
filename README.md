# Carry — pesos que rinden

**Wallet non-custodial estilo Payy para ARGt (Twin Stablecoins) con el carry trade del peso
como producto: rendimiento real de Morpho, bridge LayerZero, y un loop apalancado atómico
vía flash loans.**

🟢 **Live**: https://carry-predictumx.vercel.app
📱 Mobile-first — abrilo desde el teléfono.

---

## Qué es

El argentino tiene pesos que se derriten. Del otro lado hay gente que paga **16% anual** por
pedirlos prestados contra colateral en dólares (para shortearlos). Carry pone al usuario del
lado que cobra — en una UI de wallet, no de DeFi:

- **Wallet** — balance ARGt agregado en Arbitrum + Base + Polygon, enviar en 2 pasos.
- **Earn** — vault **ARGt Prime** (ERC-4626/Morpho Vault V2) con el share price y la tasa
  del carry en vivo. *Milestone 2 ✓*
- **Bridge** — LayerZero V2 OFT entre las 3 chains, quote de fee en vivo, manejo del dust
  de 6 decimales. *Milestone 3 ✓*
- **Loop** — leverage del carry: flash loan USDC → swap → depósito en vault → shares como
  colateral en Morpho **a nombre del usuario** → deuda USDC repaga el flash. Una tx para
  entrar, una para salir. Detrás de un umbral explícito de riesgo con consecuencias a la vista.

## Non-custodial en serio

- Privy embedded wallets (llaves en el device, MPC) — con fallback burner local.
- **Cero backend**: la app es un build estático; todo pasa browser ↔ chain.
- La posición del loop y del vault quedan **a nombre del usuario** on-chain: si Carry
  desaparece, se sale por Morpho y el vault directo.

## La honestidad como feature

Todos los números de la UI salen de lecturas on-chain en vivo (tasas del IRM, share price,
utilización). El loop hoy **no es ejecutable en mainnet** y la UI lo dice con el motivo
exacto: no existe liquidez DEX ARGt/USDC en ningún venue de Arbitrum (verificado). La
máquina completa está probada en fork contra los contratos reales.

## Correr

```bash
./init.sh                      # bootstrap (foundry + pnpm)
cd contracts && forge test --fork-url https://arb1.arbitrum.io/rpc -vv   # 10 tests, fork real
cd app && pnpm dev             # completar VITE_PRIVY_APP_ID en app/.env (o queda en modo burner)
```

## Contratos (`contracts/`)

| Contrato | Qué hace |
|---|---|
| `CarryLoop.sol` | leverage/deleverage atómico vía `Morpho.flashLoan` (fee 0). Posición a nombre del user; performance fee sólo sobre ganancia, tope inmutable 20% |
| `SArgtOracle.sol` | precio sARGt/USDC componiendo el feed real de Twin × `convertToAssets` del vault |
| `swappers/` | `ISwapper` pluggable: `UniV3Swapper` (producción) + `SeededSwapper` (fork, la pata de liquidez que aún no existe) |
| `script/DeployLoop.s.sol` | deploy real en Arbitrum: oracle + `createMarket(sARGt/USDC, LLTV 77%)` — permissionless, sólo gas |

**Tests (fork Arbitrum, 10/10):** loop e2e con k=2 (salud 1.54 → intereses reales 7 días →
cierre total), fee sobre profit, guards (`VaultIlliquid`, autorización), milestone 2
(deposit/redeem del vault + la prueba de que `maxDeposit()==0` miente), milestone 3
(quote/send del bridge + dust flooring).

## Hallazgos del research on-chain (20/8/2026)

1. El vault ARGt Prime es **Morpho Vault V2** síncrono sin whitelist — pero sus `max*()`
   devuelven **0 siempre**: validar con ellos rompe el 100% de las operaciones.
2. El "bridge de Twin" es un **LayerZero V2 OFT Adapter** estándar (peers verificados).
3. ARGt **no tiene permit** (EIP-2612) — por eso el router.
4. El market del loop (colateral sARGt → deuda USDC) **no existía: lo creamos** —
   `createMarket` es permissionless.
5. La tasa del carry es real: **supply 13,4% / borrow 16,1%** (util 83%) en el market
   ARGt/USDC de Morpho — leída en vivo por la app.

## Stack

TypeScript · React 19 · Vite · viem · Privy · TanStack Query · Foundry · Solidity 0.8.28

## Direcciones (Arbitrum)

Ver `AGENTS.md` — todas verificadas con `cast call` antes de usarse.
