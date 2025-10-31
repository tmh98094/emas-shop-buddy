// Centralized cart utility functions

export interface SelectedVariant {
  name: string;
  value: string;
  id: string;
  weight_adjustment?: number; // Optional weight adjustment in grams
}

export type SelectedVariantsMap = Record<string, SelectedVariant>;

/**
 * Format selected variants for display
 * Example: { "Size": {..., value: "5cm"}, "Color": {..., value: "Gold"} } => "Size: 5cm, Color: Gold"
 */
export function formatVariantsForDisplay(variants: SelectedVariantsMap): string {
  if (!variants || Object.keys(variants).length === 0) return "";
  
  return Object.values(variants)
    .map((v) => `${v.name}: ${v.value}`)
    .join(", ");
}

/**
 * Parse variant selection string back to object
 * Example: "Size: 5cm, Color: Gold" => { "Size": {...}, "Color": {...} }
 */
export function parseVariantSelection(variantString: string): SelectedVariantsMap {
  if (!variantString) return {};
  
  const variants: SelectedVariantsMap = {};
  const parts = variantString.split(", ");
  
  parts.forEach((part) => {
    const [name, value] = part.split(": ");
    if (name && value) {
      variants[name] = { name, value, id: "" };
    }
  });
  
  return variants;
}

/**
 * Validate that all required variant groups have selections
 */
export function validateVariantSelection(
  variantGroups: Record<string, any[]>,
  selectedVariants: SelectedVariantsMap
): { isValid: boolean; message: string } {
  const requiredGroups = Object.keys(variantGroups);
  const selectedGroups = Object.keys(selectedVariants);
  
  const missingGroups = requiredGroups.filter(
    (group) => !selectedGroups.includes(group)
  );
  
  if (missingGroups.length > 0) {
    return {
      isValid: false,
      message: `Please select: ${missingGroups.join(", ")}`,
    };
  }
  
  return { isValid: true, message: "" };
}

/**
 * Calculate item price with quantity
 */
export function calculateItemPrice(
  goldPrice: number,
  weightGrams: number,
  labourFee: number,
  quantity: number = 1
): number {
  return Math.round((goldPrice * weightGrams + labourFee) * quantity * 100) / 100;
}
