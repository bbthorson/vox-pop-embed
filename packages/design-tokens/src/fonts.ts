/**
 * Font configuration shared between apps/web (Next.js + `next/font/google`)
 * and the future apps/embed (Vite + `@fontsource/*`).
 *
 * This module exports the CSS variable NAMES + the loader configuration
 * constants. It does NOT load fonts itself — `next/font/google` only
 * works in Next.js, and `@fontsource/*` is a different distribution
 * mechanism. Each app loads fonts in its own way; the shared part is
 * the CSS variable names (so the Tailwind preset can reference them
 * consistently) plus weight / subset choices.
 *
 * Usage in apps/web (in app/layout.tsx):
 *
 *   import { Rubik, Arvo } from 'next/font/google';
 *   import { FONT_RUBIK_VAR, FONT_ARVO_VAR, RUBIK_CONFIG, ARVO_CONFIG } from '@vox-pop/design-tokens/fonts';
 *
 *   const rubik = Rubik({ ...RUBIK_CONFIG, variable: FONT_RUBIK_VAR });
 *   const arvo  = Arvo({ ...ARVO_CONFIG, variable: FONT_ARVO_VAR });
 *
 * Usage in apps/embed (in main.tsx, future PR 4):
 *
 *   import '@fontsource/rubik/400.css';
 *   import '@fontsource/rubik/500.css';
 *   import '@fontsource/arvo/400.css';
 *   import '@fontsource/arvo/700.css';
 *
 * (The CSS variables are set on `:root` via globals, with the family
 * value chosen so the same `var(--font-rubik)` resolves to Rubik in
 * either app.)
 */

/**
 * CSS variable name for the body / sans font (Rubik).
 *
 * Used by both apps + the Tailwind preset's `fontFamily.sans`.
 */
export const FONT_RUBIK_VAR = '--font-rubik';

/**
 * CSS variable name for the heading / serif font (Arvo).
 */
export const FONT_ARVO_VAR = '--font-arvo';

/**
 * CSS variable name for the utility / mono font (Courier Prime).
 *
 * The third face, added with the marketing sub-register. Arvo is a slab
 * display face and goes muddy at 11px in caps, so it cannot carry the meta
 * layer the dense marketing treatments are built on — listing keys, spec
 * rows, rundown columns, timecodes, small-caps labels.
 *
 * Courier Prime rather than a techy mono because the reference material is
 * printed: directories, run sheets, station logs and set lists are typewriter
 * artefacts, and a Courier sits on warm paper where JetBrains Mono does not.
 * Swapping the face is a one-line change here plus the loader in each app —
 * the Tailwind preset only ever names the role (`font-mono`).
 */
export const FONT_COURIER_VAR = '--font-courier';

/** `next/font/google` Rubik configuration. */
export const RUBIK_CONFIG = {
    subsets: ['latin'],
    display: 'swap' as const,
} as const;

/** `next/font/google` Arvo configuration. Weights chosen to match the heading + body-bold needs. */
export const ARVO_CONFIG = {
    subsets: ['latin'],
    weight: ['400', '700'] as const,
    display: 'swap' as const,
} as const;

/** `next/font/google` Courier Prime configuration. Regular + bold; no italic — the
 *  meta layer never sets italic, and the extra weight is dead bytes on a
 *  prerendered marketing page. */
export const COURIER_CONFIG = {
    subsets: ['latin'],
    weight: ['400', '700'] as const,
    display: 'swap' as const,
} as const;
