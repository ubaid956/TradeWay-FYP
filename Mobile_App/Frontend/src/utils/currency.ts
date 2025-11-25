export type CurrencyFormatOptions = {
  fractionDigits?: number;
};

const FALLBACK_PREFIX = 'PKR';

export const formatCurrency = (
  value: number | string | null | undefined,
  options: CurrencyFormatOptions = {}
): string => {
  const { fractionDigits = 0 } = options;
  const amount = typeof value === 'string' ? Number(value) : value ?? 0;

  if (amount === null || amount === undefined || Number.isNaN(amount)) {
    return `${FALLBACK_PREFIX} 0`;
  }

  try {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      currencyDisplay: 'code',
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(amount);
  } catch (error) {
    const fixed = amount.toFixed(fractionDigits);
    return `${FALLBACK_PREFIX} ${fixed}`;
  }
};
