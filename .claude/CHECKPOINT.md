# CHECKPOINT — Carry

> Actualizado por el leader al cerrar cada bloque. Deadline: 20/8 18:00.

## Estado: BLOQUE 5 — deployado ✓
- [x] Research on-chain completo (ver AGENTS.md: tabla + 6 trampas)
- [x] init.sh + scaffold + harness
- [x] BLOQUE 2: SArgtOracle + CarryLoop + swappers + LoopFork e2e (7/7)
- [x] BLOQUE 3: VaultFork + BridgeFork (10/10 total) + DeployLoop.s.sol
- [x] BLOQUE 4: app completa (Home/Enviar/Earn/Bridge/Loop/Menú) — tsc limpio, build ok
- [x] BLOQUE 5: PROD LIVE → https://carry-predictumx.vercel.app (protection off, 200)
- [ ] Pendiente usuario: VITE_PRIVY_APP_ID (hoy corre en modo burner) → vercel env add + redeploy
- [ ] Opcional: deploy mainnet oracle+market (DeployLoop.s.sol, necesita deployer con ETH)
- [ ] Submission del workshop (URL, nombre, mail, X) — cierra 18:00

## Bloqueos
- `VITE_PRIVY_APP_ID` pendiente (usuario). Fallback burner listo por diseño.
- Deploy mainnet de oracle+market: opcional, requiere deployer con ETH en Arbitrum.

## Orden de sacrificio si el tiempo aprieta
deploy mainnet → fee del loop → deleverage parcial → Activity screen.
El loop e2e en fork y las 4 pantallas core no se negocian.
