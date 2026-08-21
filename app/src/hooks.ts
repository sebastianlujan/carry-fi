import { useQuery } from '@tanstack/react-query'
import type { Address } from 'viem'
import { allBalances } from './chain/bridge'
import { sharePrice, vaultPosition, vaultRealizedApy } from './chain/vault'
import { marketRates, marketSupplyPosition } from './chain/morpho'
import { loopPosition, loopChecks } from './chain/loop'
import { fetchActivity } from './chain/activity'

export function useBalances(address: Address | null) {
  return useQuery({
    queryKey: ['balances', address],
    queryFn: () => allBalances(address as Address),
    enabled: !!address,
    refetchInterval: 15_000,
  })
}

export function useSharePrice(vault?: `0x${string}`) {
  return useQuery({ queryKey: ['sharePrice', vault], queryFn: () => sharePrice(vault), refetchInterval: 30_000 })
}

export function useVaultApy() {
  return useQuery({ queryKey: ['vaultApy'], queryFn: vaultRealizedApy, refetchInterval: 60_000 })
}

export function useVaultPosition(address: Address | null, vault?: `0x${string}`) {
  return useQuery({
    queryKey: ['vaultPos', address, vault],
    queryFn: () => vaultPosition(address as Address, vault),
    enabled: !!address,
    refetchInterval: 15_000,
  })
}

export function useMarketPosition(address: Address | null, marketId?: `0x${string}`) {
  return useQuery({
    queryKey: ['marketPos', address, marketId],
    queryFn: () => marketSupplyPosition(address as Address, marketId),
    enabled: !!address,
    refetchInterval: 15_000,
  })
}

export function useCarryRates(marketId?: `0x${string}`) {
  return useQuery({ queryKey: ['rates', marketId], queryFn: () => marketRates(marketId), refetchInterval: 30_000 })
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

export function useActivity(address: Address | null) {
  return useQuery({
    queryKey: ['activity', address],
    queryFn: () => fetchActivity(address as Address),
    enabled: !!address,
    refetchInterval: 30_000,
  })
}
