export function formatCRC(amount: number, withSymbol = true) {
  const nf = new Intl.NumberFormat('es-CR', {
    style: 'currency',
    currency: 'CRC',
    minimumFractionDigits: 2,
  });
  const formatted = nf.format(Number.isFinite(amount) ? amount : 0);
  return withSymbol ? formatted : formatted.replace(/[^\d.,-]/g, '').trim();
}

export function parseMoneyInput(input: string) {
  const norm = input.replace(/[^\d.,-]/g, '').replace('.', '').replace(',', '.');
  const n = Number(norm);
  return Number.isFinite(n) ? n : 0;
}
