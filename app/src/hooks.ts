import { useQuery } from '@tanstack/react-query'
import type { Address } from 'viem'
import { allBalances } from './chain/bridge'
import { sharePrice, vaultPosition, vaultRealizedApy } from './chain/vault'
import { marketRates } from './chain/morpho'
import { loopPosition, loopChecks } from './chain/loop'

export function useBalances(address: Address | null) {
  return useQuery({
    queryKey: ['balances', address],
    queryFn: () => allBalances(address as Address),
    enabled: !!address,
    refetchInterval: 15_000,
  })
}

export function useSharePrice() {
  return useQuery({ queryKey: ['sharePrice'], queryFn: sharePrice, refetchInterval: 30_000 })
}

export function useVaultApy() {
  return useQuery({ queryKey: ['vaultApy'], queryFn: vaultRealizedApy, refetchInterval: 60_000 })
}

export function useVaultPosition(address: Address | null) {
  return useQuery({
    queryKey: ['vaultPos', address],
    queryFn: () => vaultPosition(address as Address),
    enabled: !!address,
    refetchInterval: 15_000,
  })
}

export function useCarryRates() {
  return useQuery({ queryKey: ['rates'], queryFn: () => marketRates(), refetchInterval: 30_000 })
}

export function useLoopPosition(address: Address | null) {
  return useQuery({
    queryKey: ['loopPos', address],
    queryFn: () => loopPosition(address as Address),
    enabled: !!address,
    refetchInterval: 15_000,
  })
}

export function useLoopChecks() {
  return useQuery({ queryKey: ['loopChecks'], queryFn: loopChecks, refetchInterval: 60_000 })
}
