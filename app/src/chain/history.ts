// Historia local del patrimonio (USD, 2 dec como number para display del chart).
// Un snapshot por día por address, cap 120 puntos. Sólo display — nunca decisión de tx.
export interface Snap { t: number; v: number }

export function recordSnapshot(addr: string, usd: number): void {
  if (!Number.isFinite(usd)) return
  const key = `carry.history.${addr.toLowerCase()}`
  try {
    const arr: Snap[] = JSON.parse(localStorage.getItem(key) ?? '[]')
    const today = Math.floor(Date.now() / 86_400_000)
    const last = arr[arr.length - 1]
    if (last && Math.floor(last.t / 86_400_000) === today) last.v = usd
    else arr.push({ t: Date.now(), v: usd })
    localStorage.setItem(key, JSON.stringify(arr.slice(-120)))
  } catch { /* display-only */ }
}

export function readHistory(addr: string): Snap[] {
  try { return JSON.parse(localStorage.getItem(`carry.history.${addr.toLowerCase()}`) ?? '[]') } catch { return [] }
}
