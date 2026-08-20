// Wallet non-custodial: Privy embedded (llaves en el device) con fallback burner
// (VITE_WALLET=burner o sin VITE_PRIVY_APP_ID) para que la demo nunca se trabe.
import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { PrivyProvider, usePrivy, useWallets } from '@privy-io/react-auth'
import {
  createWalletClient, custom, http, publicActions,
  type Address, type Chain, type WalletClient, type PublicActions,
} from 'viem'
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts'
import { arbitrum, base, polygon } from 'viem/chains'
import { VIEM_CHAINS } from './chain/clients'
import type { ChainId } from './chain/registry'
import { CHAINS } from './chain/registry'

export type Signer = WalletClient & PublicActions

interface WalletCtx {
  ready: boolean
  address: Address | null
  login: () => void
  logout: () => void
  exportKey: (() => void) | null
  getSigner: (chainId: ChainId) => Promise<Signer>
  mode: 'privy' | 'burner'
}

const Ctx = createContext<WalletCtx | null>(null)
export function useWallet(): WalletCtx {
  const c = useContext(Ctx)
  if (!c) throw new Error('WalletProvider missing')
  return c
}

const PRIVY_APP_ID: string = import.meta.env.VITE_PRIVY_APP_ID ?? ''
const USE_BURNER = import.meta.env.VITE_WALLET === 'burner' || !PRIVY_APP_ID

// ── burner: key local en el device (localStorage), non-custodial por definición ──
function burnerKey(): `0x${string}` {
  const k = localStorage.getItem('carry.burner')
  if (k) return k as `0x${string}`
  const fresh = generatePrivateKey()
  localStorage.setItem('carry.burner', fresh)
  return fresh
}

function BurnerProvider({ children }: { children: ReactNode }) {
  const value = useMemo<WalletCtx>(() => {
    const account = privateKeyToAccount(burnerKey())
    return {
      ready: true,
      address: account.address,
      login: () => {},
      logout: () => { localStorage.removeItem('carry.burner'); location.reload() },
      exportKey: () => {
        void navigator.clipboard.writeText(burnerKey())
        alert('Clave privada copiada al portapapeles. Guardala: es LA custodia.')
      },
      getSigner: (chainId) => {
        const chain: Chain = VIEM_CHAINS[chainId]
        return Promise.resolve(
          createWalletClient({ account, chain, transport: http(CHAINS[chainId].rpcs[0]) }).extend(publicActions),
        )
      },
      mode: 'burner',
    }
  }, [])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// ── privy ──
function PrivyBridge({ children }: { children: ReactNode }) {
  const { ready, authenticated, login, logout, exportWallet } = usePrivy()
  const { wallets } = useWallets()
  const wallet = wallets.find((w) => w.walletClientType === 'privy') ?? wallets[0]

  const value = useMemo<WalletCtx>(() => ({
    ready,
    address: authenticated && wallet ? (wallet.address as Address) : null,
    login,
    logout: () => { void logout() },
    exportKey: wallet?.walletClientType === 'privy' ? () => { void exportWallet() } : null,
    getSigner: async (chainId) => {
      if (!wallet) throw new Error('sin wallet')
      await wallet.switchChain(chainId)
      const provider = await wallet.getEthereumProvider()
      const chain: Chain = VIEM_CHAINS[chainId]
      return createWalletClient({
        account: wallet.address as Address, chain, transport: custom(provider),
      }).extend(publicActions)
    },
    mode: 'privy',
  }), [ready, authenticated, wallet, login, logout, exportWallet])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function WalletProvider({ children }: { children: ReactNode }) {
  if (USE_BURNER) return <BurnerProvider>{children}</BurnerProvider>
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: ['email', 'google'],
        embeddedWallets: { ethereum: { createOnLogin: 'users-without-wallets' } },
        appearance: { theme: 'light', accentColor: '#141414' },
        defaultChain: arbitrum,
        supportedChains: [arbitrum, base, polygon],
      }}
    >
      <PrivyBridge>{children}</PrivyBridge>
    </PrivyProvider>
  )
}
