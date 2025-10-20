/**
 * Price staleness checking utilities
 * Helps detect when cart prices need to be refreshed due to gold price changes
 */

export interface PriceChangeInfo {
  hasChanged: boolean;
  percentageChange: number;
  oldPrice: number;
  newPrice: number;
}

const SIGNIFICANT_CHANGE_THRESHOLD = 2; // 2% change
const MAX_PRICE_AGE_HOURS = 24; // Prices older than 24 hours should be refreshed

/**
 * Check if a cart item's locked price is significantly different from current price
 */
export const checkPriceChange = (
  lockedGoldPrice: number,
  currentGoldPrice: number
): PriceChangeInfo => {
  const percentageChange = Math.abs(
    ((currentGoldPrice - lockedGoldPrice) / lockedGoldPrice) * 100
  );

  return {
    hasChanged: percentageChange >= SIGNIFICANT_CHANGE_THRESHOLD,
    percentageChange: Math.round(percentageChange * 10) / 10,
    oldPrice: lockedGoldPrice,
    newPrice: currentGoldPrice,
  };
};

/**
 * Check if a cart item's price is stale (too old)
 */
export const isPriceStale = (lockedAt: string): boolean => {
  const lockedTime = new Date(lockedAt).getTime();
  const now = new Date().getTime();
  const hoursSinceLocked = (now - lockedTime) / (1000 * 60 * 60);
  
  return hoursSinceLocked >= MAX_PRICE_AGE_HOURS;
};

/**
 * Get human-readable time since price was locked
 */
export const getTimeSinceLocked = (lockedAt: string): string => {
  const lockedTime = new Date(lockedAt).getTime();
  const now = new Date().getTime();
  const hoursSinceLocked = Math.floor((now - lockedTime) / (1000 * 60 * 60));
  
  if (hoursSinceLocked < 1) {
    const minutesSinceLocked = Math.floor((now - lockedTime) / (1000 * 60));
    return `${minutesSinceLocked} minute${minutesSinceLocked !== 1 ? 's' : ''} ago`;
  }
  
  if (hoursSinceLocked < 24) {
    return `${hoursSinceLocked} hour${hoursSinceLocked !== 1 ? 's' : ''} ago`;
  }
  
  const daysSinceLocked = Math.floor(hoursSinceLocked / 24);
  return `${daysSinceLocked} day${daysSinceLocked !== 1 ? 's' : ''} ago`;
};
