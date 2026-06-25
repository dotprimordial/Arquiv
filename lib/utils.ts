import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normalize email address for comparison
 * Trims whitespace and converts to lowercase
 */
export function normalizeEmail(email: string | undefined | null): string {
  if (!email) return '';
  return email.trim().toLowerCase();
}

/**
 * Sanitize error message for production
 * Returns generic message in production, detailed message in development
 */
export function sanitizeErrorMessage(error: Error | string, genericMessage: string = 'Ocorreu um erro. Tente novamente.'): string {
  const errorMessage = typeof error === 'string' ? error : error.message;
  
  if (process.env.NODE_ENV === 'production') {
    return genericMessage;
  }
  
  return errorMessage;
}
