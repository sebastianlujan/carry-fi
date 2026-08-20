# CHECKPOINT — CarryFi

> Última actualización: 20/8/2026 ~18:20. **Submission ENVIADA antes de las 18:00** ✓

## Estado: SHIPPED 🚲

- 🟢 Prod: https://carry-predictumx.vercel.app (Vercel `predictumx/carry`, protection off)
- 🟢 Repo: https://github.com/sebastianlujan/carry-fi (público, todo en inglés)
- 🟢 Contratos: 10/10 fork tests (loop e2e k=2, vault M2, bridge M3)
- 🟢 Login: **Privy con Google-only** (app id `cmt1zfaz…4gz6`; createWallet explícito
  post-auth porque el dashboard tiene create_on_login=off; email deshabilitado a pedido)
- 🟢 Milestones: M1 ✓ (Privy + balance + enviar + recibir) · M2 ✓ (vault) · M3 ✓ (bridge)
- 🟢 Home v3: gráfica de proyección (historia lima + peso estable/deval 15/deval 25 con
  APY live), patrimonio en US$ neto de deuda, selector de red, MIS TOKENS (ARGt + BRAt/PERt
  verificados con cast), verificada en teléfono por el usuario

## Bloques completados
1. Research on-chain (tabla verificada + 6 trampas → AGENTS.md)
2. Contratos: SArgtOracle + CarryLoop + swappers + LoopFork/VaultFork/BridgeFork
3. App: chain layer puro + Wallet/Enviar/Recibir/Earn/Bridge/Loop/Más
4. Harness .claude + init.sh + docs en inglés
5. Deploy + Privy + submission + branding bici + gráfica de proyección

## Próximos pasos (si el proyecto sigue)
- [ ] Fondear wallet demo (ETH gas + ARGt) para demo en vivo con writes
- [ ] Deploy mainnet: `forge script script/DeployLoop.s.sol --rpc-url arbitrum --broadcast -i 1`
      (oracle + market sARGt/USDC, sólo gas) → setear VITE_CARRY_LOOP/VITE_SARGT_ORACLE
- [ ] Earn directo al market Morpho (13,4% real vs vault idle 0,0065%) — mayor salto de producto
- [ ] Liquidez DEX ARGt/USDC (capital, no código) → desbloquea el loop en mainnet
- [ ] Deleverage parcial · alertas de salud · QR real en Recibir · Activity feed
- [ ] vitest del chain layer · DeployLoop idempotente · multi-token completo (config)

## Deuda conocida (no urgente)
`_sweep` de shares no-op · riesgo "Bajo" por ausencia de CARRY_LOOP · refetch 15s sobre
RPCs públicos (failover triple presente) · ganancia acumulada usa baseline localStorage
(se resetea si limpian el browser)
