/**
 * `@vox-pop/design-tokens` — barrel re-export.
 *
 * Most consumers should import from specific sub-paths instead:
 *
 *   `@vox-pop/design-tokens/tokens.css`     — CSS variable definitions
 *   `@vox-pop/design-tokens/tokens`         — TypeScript constants
 *   `@vox-pop/design-tokens/tailwind-preset` — shared Tailwind preset
 *   `@vox-pop/design-tokens/fonts`           — font config constants
 *
 * The bare `@vox-pop/design-tokens` import is a convenience for callers
 * that want a couple of values without picking a subpath.
 */

export {
    lightTokens,
    darkTokens,
    editorialTokens,
    darkEditorialTokens,
} from './tokens';
export type { TokenSet } from './tokens';
export {
    FONT_RUBIK_VAR,
    FONT_ARVO_VAR,
    RUBIK_CONFIG,
    ARVO_CONFIG,
} from './fonts';
