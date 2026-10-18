import type { Config } from 'tailwindcss';
import { preset as voxPopPreset } from '@vox-pop/design-tokens/tailwind-preset';

/**
 * apps/embed Tailwind config.
 *
 * Mirrors apps/web's setup — extends the shared `@vox-pop/design-tokens`
 * preset with embed-specific concerns. Scans brand-ui's source so
 * Tailwind's JIT picks up class names referenced from that package.
 *
 * Differences vs apps/web's config:
 *   - No `tailwindcss-animate` plugin (embed doesn't ship Radix surfaces).
 *   - No Radix accordion keyframes (same reason).
 *   - `content` paths target Vite's `index.html` + `src/`, not Next.js's
 *     `app/` + `components/`.
 */
export default {
    darkMode: 'class',
    presets: [voxPopPreset],
    content: [
        './index.html',
        './src/**/*.{ts,tsx}',
        // `@vox-pop/brand-ui` source — Tailwind regex-greps these files
        // for class names, so we point at src rather than built dist.
        '../../packages/brand-ui/src/**/*.{ts,tsx}',
    ],
} satisfies Config;
