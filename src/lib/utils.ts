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

// Dynamic font size based on text length for responsive card text
export const getDynamicFontSize = (text: string): string => {
  const length = text.length;
  if (length <= 10) return "text-2xl md:text-3xl";
  if (length <= 20) return "text-xl md:text-2xl";
  if (length <= 30) return "text-lg md:text-xl";
  return "text-base md:text-lg";
};
