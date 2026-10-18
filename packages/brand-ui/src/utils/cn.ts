import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Tailwind className merge — same `cn` helper apps/web uses, copied
 * into the package so brand-ui doesn't depend on apps/web's `@/lib/utils`.
 * Behavior is byte-identical (clsx → twMerge composition).
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
