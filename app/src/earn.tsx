// Selección de Earn (activo + colateral) compartida entre la pantalla Posición y el chip
// del header, para que el carry de arriba refleje el activo elegido.
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

interface EarnCtx { assetIx: number; setAssetIx: (n: number) => void; marketIx: number; setMarketIx: (n: number) => void }
const Ctx = createContext<EarnCtx | null>(null)

export function useEarn(): EarnCtx {
  const c = useContext(Ctx)
  if (!c) throw new Error('EarnProvider missing')
  return c
}

export function EarnProvider({ children }: { children: ReactNode }) {
  const [assetIx, setAssetIxState] = useState(0)
  const [marketIx, setMarketIx] = useState(0)
  const value = useMemo<EarnCtx>(() => ({
    assetIx,
    setAssetIx: (n) => { setAssetIxState(n); setMarketIx(0) }, // cambiar activo resetea el colateral
    marketIx,
    setMarketIx,
  }), [assetIx, marketIx])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
