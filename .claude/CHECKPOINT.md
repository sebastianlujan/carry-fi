# CHECKPOINT — CarryFi

> Última actualización: 20/8/2026 ~21:40. **Submission ENVIADA antes de las 18:00** ✓

## Estado: SHIPPED 🚲 — todos los milestones + bonus verdes

- 🟢 Prod: https://carry-predictumx.vercel.app (Vercel `predictumx/carry`, protection off)
- 🟢 Repo: https://github.com/sebastianlujan/carry-fi (público, todo en inglés)
- 🟢 Contratos: **13/13 fork tests** (loop e2e, vault M2, bridge M3, market supply/withdraw, partial-deleverage rechazado)
- 🟢 Login: Privy Google-only (createWallet explícito post-auth; el dashboard tiene
  create_on_login=off). Fix del race de red: getSigner espera a que el provider confirme
  la chain antes de firmar (bug "8453 vs 42161" resuelto).

## Post-submission (mejoras)
- **Earn al market real** (13,4%) como default + Vault M2 como opción · **Ethereum** como 4ta
  chain del bridge (adapter verificado, peers bidireccionales) · **Enviar multi-token ARGt/BRAt**
  (bonus real) · **Actividad on-chain** en el nav · **Más** en botón ••• del header · Home
  reordenado (acciones arriba, trust abajo) · Riesgo dinámico (Bajo sin loop, live con posición)
  · "palanca" en vez de "k" (texto y variable) · chip de dirección en Recibir con fondo blanco.
- **Review pass** (lead→reviewer→implementer): 6 trampas limpias, direcciones verificadas
  on-chain, cero CRITICAL/HIGH. Aplicados 2 MEDIUM del CarryLoop (_sweep de shares real;
  deleverage parcial rechazado) + fix del polvo en withdraw-all del market. LOW restante:
  marketSupplyPosition sin accrual (display ~exacto), sin nonReentrant (riesgo bajo).

## Milestones
- **M1** balance + transfers ARGt ✅
- **M2** vault Morpho (ARGt Prime, ERC-4626) ✅ — se mantiene como venue en Earn
- **M3** bridge cross-chain (LayerZero OFT) ✅
- **🎁 Bonus** Twin adicional (BRAt) ✅ — **transaccionable** (Enviar multi-token ARGt/BRAt,
  direcciones verificadas on-chain en las 3 chains). Bridge de BRAt NO: su adapter OFT no
  se pudo verificar (no shippeamos address sin verificar).

## Features en prod
Nav: Wallet · Carry · Posición · **Actividad**. Más (ajustes) en botón ••• del header.
Wallet (balance 3 redes, selector de red pill+menú) · Enviar multi-token · Recibir con QR
(negro sobre blanco) + dirección completa · **Earn: Market directo a Morpho 13,4% real
(default) + Vault M2** con gráfica de proyección lima/negro · Bridge con quote live · Loop
"La bicicleta" gateado honesto (corre en fork) · Actividad on-chain real (getLogs, sin mock)
· Más (wallet, seguridad, contratos, logout).

## Próximos pasos (si el proyecto sigue)
- [ ] **Loop real en mainnet**: (1) crear+seedear pool Uniswap ARGt/USDC (~$100 capital, EL
      blocker), (2) `forge script DeployLoop.s.sol` (oracle+market sARGt/USDC, sólo gas),
      (3) `setSwapper(uniV3)`. El `UniV3Swapper` ya está escrito.
- [ ] Fondear wallet demo (ETH gas + ARGt) para demo en vivo con writes
- [ ] Bridge de BRAt (falta su adapter OFT oficial de Twin)
- [ ] Deleverage parcial · alertas de salud del loop · idempotencia de DeployLoop · vitest del front

## Deuda conocida (no urgente)
`_sweep` de shares no-op · riesgo "Bajo" por ausencia de CARRY_LOOP deployado · refetch 15s
sobre RPCs públicos (failover triple presente) · Actividad: Base/Polygon best-effort (sus
RPCs limitan getLogs), Arbitrum trae historia completa.
