// Formato es-AR: $1.128,54 — como Payy pero en pesos.
const nf2 = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const nf0 = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 })

export function fromWei(v: bigint, decimals = 18): number {
  // sólo para DISPLAY — jamás usar number en el camino de un tx
  return Number(v / 10n ** BigInt(decimals - 6)) / 1e6
}

export function fmtArgt(v: bigint): string {
  const n = fromWei(v)
  return n >= 1000 ? nf0.format(Math.floor(n)) : nf2.format(n)
}

export function fmtMoney(v: bigint, decimals = 18): string {
  return nf2.format(fromWei(v, decimals))
}

export function fmtPct(x: number, digits = 2): string {
  return `${x >= 0 ? '+' : ''}${x.toFixed(digits)}%`
}

export function parseArgt(s: string): bigint | null {
  const clean = s.replace(/\./g, '').replace(',', '.').trim()
  if (!clean || Number.isNaN(Number(clean))) return null
  const [int, frac = ''] = clean.split('.')
  const fracPadded = (frac + '0'.repeat(18)).slice(0, 18)
  try { return BigInt(int || '0') * 10n ** 18n + BigInt(fracPadded) } catch { return null }
}

export function shortAddr(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-4)}`
}
