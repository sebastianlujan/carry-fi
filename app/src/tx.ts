// simulate SIEMPRE antes de firmar (regla del repo). Cero `number` en montos.
import type { Abi, Address } from 'viem'
import type { Signer } from './wallet'
import { erc20Abi } from './chain/abis'
import { clientFor } from './chain/clients'
import type { ChainId } from './chain/registry'

export async function runTx(
  signer: Signer,
  args: { address: Address; abi: Abi; functionName: string; args: readonly unknown[]; value?: bigint },
): Promise<`0x${string}`> {
  const account = signer.account
  if (!account) throw new Error('sin cuenta')
  const { request } = await signer.simulateContract({ ...args, account, chain: signer.chain })
  const hash = await signer.writeContract(request)
  await signer.waitForTransactionReceipt({ hash, confirmations: 1 })
  return hash
}

export async function ensureAllowance(
  signer: Signer, chainId: ChainId, token: Address, ownerAddr: Address, spender: Address, amount: bigint,
): Promise<void> {
  const current = await clientFor(chainId).readContract({
    address: token, abi: erc20Abi, functionName: 'allowance', args: [ownerAddr, spender],
  })
  if (current >= amount) return
  await runTx(signer, { address: token, abi: erc20Abi as Abi, functionName: 'approve', args: [spender, amount] })
}

export function errMsg(e: unknown): string {
  if (e instanceof Error) {
    const m = e.message
    if (m.includes('User rejected') || m.includes('denied')) return 'Firmá para continuar.'
    if (/insufficient funds|gas required exceeds|fee cap/i.test(m))
      return 'Te falta ETH/POL para el gas en esta red. Mandale un poco de gas a tu dirección y reintentá.'
    return m.split('\n')[0].slice(0, 140)
  }
  return 'Algo falló.'
}
