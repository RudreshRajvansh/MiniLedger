/**
 * Formats a numeric amount in Indian Rupees (INR) with standard en-IN numbering grouping.
 * e.g., 12500 -> ₹12,500
 * e.g., 1500000 -> ₹15,00,000
 */
export function formatCurrency(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '₹0';
  }

  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Fallback if Intl.NumberFormat is unavailable in older engines
    const parts = amount.toFixed(2).split('.');
    let integerPart = parts[0];
    const decimalPart = parts[1] === '00' ? '' : `.${parts[1]}`;

    const lastThree = integerPart.substring(integerPart.length - 3);
    const otherNumbers = integerPart.substring(0, integerPart.length - 3);
    const formatted =
      otherNumbers !== ''
        ? otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree
        : lastThree;

    return `₹${formatted}${decimalPart}`;
  }
}
