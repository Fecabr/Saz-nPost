export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-CR', {
    style: 'currency',
    currency: 'CRC',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatCurrencyCRC = (amount: number, withSymbol = true): string => {
  const formatter = new Intl.NumberFormat('es-CR', {
    style: 'currency',
    currency: 'CRC',
    currencyDisplay: 'symbol',
    minimumFractionDigits: 2,
  });

  if (withSymbol) {
    return formatter.format(amount);
  }

  return formatter.format(amount).replace(/[₡\s]/g, '').trim();
};
