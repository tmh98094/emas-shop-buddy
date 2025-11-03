import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// IC Number validation utilities
export const validateICNumber = (ic: string): boolean => {
  // Remove any non-digit characters
  const cleaned = ic.replace(/\D/g, '');
  // Must be exactly 12 digits
  return cleaned.length === 12;
};

export const formatICNumber = (ic: string): string => {
  return ic.replace(/\D/g, '');
};
