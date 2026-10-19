import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Joins class names and lets later Tailwind classes override earlier ones (e.g. a caller's padding). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
