// Red seleccionada global: filtra la vista del Home y es el default de Enviar/Bridge.
// 0 = todas las redes. Persistida en localStorage.
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { CHAIN_IDS, type ChainId } from './chain/registry'

export type NetSel = ChainId | 0

interface NetCtx { sel: NetSel; setSel: (n: NetSel) => void }
const Ctx = createContext<NetCtx | null>(null)

export function useNetwork(): NetCtx {
  const c = useContext(Ctx)
  if (!c) throw new Error('NetworkProvider missing')
  return c
}

function load(): NetSel {
  const raw = Number(localStorage.getItem('carry.network') ?? '0')
  return (CHAIN_IDS as number[]).includes(raw) ? (raw as ChainId) : 0
}

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [sel, setSelState] = useState<NetSel>(load)
  const value = useMemo<NetCtx>(() => ({
    sel,
    setSel: (n) => { setSelState(n); localStorage.setItem('carry.network', String(n)) },
  }), [sel])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
