// Baseline de capital aportado al vault por address (localStorage, sólo display).
// La ganancia mostrada = valor actual − baseline; sin baseline previa, arranca en 0.
export function getBaseline(addr: string): bigint {
  try { return BigInt(localStorage.getItem(`carry.baseline.${addr.toLowerCase()}`) ?? '0') } catch { return 0n }
}
export function addBaseline(addr: string, delta: bigint): void {
  const next = getBaseline(addr) + delta
  localStorage.setItem(`carry.baseline.${addr.toLowerCase()}`, (next < 0n ? 0n : next).toString())
}
