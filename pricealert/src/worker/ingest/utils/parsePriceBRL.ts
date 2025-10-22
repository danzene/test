// Enhanced Brazilian price parser
export function parsePriceBRL(s?: string | null): number | null {
  if (!s) return null;
  
  // Remove installment indicators and promotional text
  const t = s
    .replace(/\s+/g, ' ')
    .replace(/(?:em|de)\s+\d+x.*/i, '')
    .replace(/(?:sem|com)\s+juros.*/i, '')
    .replace(/de\s*R\$\s*\d{1,3}(\.\d{3})*,\d{2}/i, '');
  
  // Extract Brazilian currency format
  const m = t.match(/R\$\s*([\d\.\,]+)/);
  if (!m) return null;
  
  // Convert Brazilian format (1.299,99) to number
  const v = Number(m[1].replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(v) && v > 0 ? Number(v.toFixed(2)) : null;
}
