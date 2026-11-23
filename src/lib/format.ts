export const fmt = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
export const fmt1 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const fmt2 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Signed number with a real minus sign: +0,25 / −0,10 */
export function signed(v: number, f = fmt2): string {
  return (v > 0 ? '+' : v < 0 ? '−' : '') + f.format(Math.abs(v));
}

/** Historical year label: -200 → "200 a.C." */
export function yearLabel(y: number): string {
  return y < 0 ? `${-y} a.C.` : String(Math.round(y));
}
