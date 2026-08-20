import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App'
import { WalletProvider } from './wallet'
import { NetworkProvider } from './network'

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 10_000 } } })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={qc}>
      <WalletProvider>
        <NetworkProvider>
          <App />
        </NetworkProvider>
      </WalletProvider>
    </QueryClientProvider>
  </StrictMode>,
)
