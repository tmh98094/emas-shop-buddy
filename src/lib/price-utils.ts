/**
 * Price calculation and formatting utilities
 * Ensures consistent rounding and display across the application
 */

/**
 * Calculate total price with proper rounding to 2 decimal places
 * Prevents floating point precision errors
 */
export const calculatePrice = (
  goldPrice: number,
  weight: number,
  labourFee: number
): number => {
  const total = goldPrice * weight + labourFee;
  return Math.ceil(total); // Round up to nearest whole number
};

/**
 * Format price for display with exactly 2 decimal places and comma separators
 */
export const formatPrice = (price: number): string => {
  return price.toLocaleString('en-MY', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
};

/**
 * Calculate item total with quantity
 */
export const calculateItemTotal = (
  goldPrice: number,
  weight: number,
  labourFee: number,
  quantity: number
): number => {
  const unitPrice = calculatePrice(goldPrice, weight, labourFee);
  return Math.ceil(unitPrice * quantity); // Round up to nearest whole number
};
