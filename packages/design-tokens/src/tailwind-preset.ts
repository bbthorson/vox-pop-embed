import type { Config } from 'tailwindcss';
import { FONT_RUBIK_VAR, FONT_ARVO_VAR, FONT_COURIER_VAR } from './fonts';

/**
 * Shared Tailwind preset for Vox Pop apps.
 *
 * Maps the CSS variables defined in `tokens.css` to Tailwind theme
 * keys, so Tailwind classes like `bg-primary`, `text-ink-strong`,
 * `rounded-lg`, `shadow-editorial` resolve to the right HSL values
 * regardless of which app (apps/web Next.js, apps/embed Vite) is
 * doing the resolving.
 *
 * App-specific concerns stay in each app's own `tailwind.config.ts`:
 *
 *   - `content` paths (each app scans its own components)
 *   - `plugins` (tailwindcss-animate for apps/web; embed may differ)
 *   - app-specific keyframes/animations (Radix accordion variants in
 *     apps/web; embed has none today)
 *
 * The preset is the FOUNDATION — apps extend it.
 */
/**
 * Exported as a NAMED export rather than `default` to avoid CommonJS
 * default-interop pitfalls — Tailwind's `tailwind.config.ts` loader
 * (jiti / @swc/core / similar) historically interops default exports
 * inconsistently. Named imports are unambiguous in every loader.
 */
export const preset: Partial<Config> = {
    theme: {
        extend: {
            fontFamily: {
                sans: [`var(${FONT_RUBIK_VAR})`, 'sans-serif'],
                heading: [`var(${FONT_ARVO_VAR})`, 'serif'],
                serif: [`var(${FONT_ARVO_VAR})`, 'serif'],
                /**
                 * The utility face — listing keys, spec rows, timecodes,
                 * small-caps meta. Named by ROLE so the face behind it can
                 * change without touching a call site.
                 *
                 * The fallback lives INSIDE the `var()` on purpose. Only
                 * apps/public loads Courier Prime (it belongs to the marketing
                 * sub-register); apps/web and apps/embed never define
                 * `--font-courier`. Written as a bare `var(--font-courier)`
                 * with siblings after it, an undefined variable would
                 * invalidate the whole `font-family` declaration rather than
                 * skipping to the next item — so every `font-mono` call site
                 * in the dashboard (phone numbers, handles, code blocks) would
                 * silently fall back to inherited Rubik. `var(x, fallback)`
                 * degrades to the system mono instead, which is what those
                 * call sites were already getting.
                 */
                mono: [`var(${FONT_COURIER_VAR}, ui-monospace)`, 'monospace'],
            },
            colors: {
                background: 'hsl(var(--background))',
                foreground: 'hsl(var(--foreground))',
                card: {
                    DEFAULT: 'hsl(var(--card))',
                    foreground: 'hsl(var(--card-foreground))',
                },
                popover: {
                    DEFAULT: 'hsl(var(--popover))',
                    foreground: 'hsl(var(--popover-foreground))',
                },
                primary: {
                    DEFAULT: 'hsl(var(--primary))',
                    foreground: 'hsl(var(--primary-foreground))',
                },
                secondary: {
                    DEFAULT: 'hsl(var(--secondary))',
                    foreground: 'hsl(var(--secondary-foreground))',
                },
                muted: {
                    DEFAULT: 'hsl(var(--muted))',
                    foreground: 'hsl(var(--muted-foreground))',
                },
                accent: {
                    DEFAULT: 'hsl(var(--accent))',
                    foreground: 'hsl(var(--accent-foreground))',
                },
                destructive: {
                    DEFAULT: 'hsl(var(--destructive))',
                    foreground: 'hsl(var(--destructive-foreground))',
                },
                success: {
                    DEFAULT: 'hsl(var(--success))',
                    foreground: 'hsl(var(--success-foreground))',
                },
                warning: {
                    DEFAULT: 'hsl(var(--warning))',
                    foreground: 'hsl(var(--warning-foreground))',
                },
                info: {
                    DEFAULT: 'hsl(var(--info))',
                    foreground: 'hsl(var(--info-foreground))',
                },
                ink: {
                    strong: 'hsl(var(--ink-strong))',
                    muted: 'hsl(var(--ink-muted))',
                    subtle: 'hsl(var(--ink-subtle))',
                },
                surface: {
                    raised: 'hsl(var(--surface-raised))',
                    sunken: 'hsl(var(--surface-sunken))',
                },
                overlay: {
                    DEFAULT: 'hsl(var(--overlay))',
                    foreground: 'hsl(var(--overlay-foreground))',
                },
                rule: 'hsl(var(--rule))',
                'accent-warm': 'hsl(var(--accent-warm))',
                border: 'hsl(var(--border))',
                input: 'hsl(var(--input))',
                ring: 'hsl(var(--ring))',
            },
            fontSize: {
                /**
                 * Fine print — the step below `text-xs` (12px) that the scale
                 * was missing. Its absence is why a dozen call sites had
                 * reached for `text-[10px]` and `text-[11px]`: two
                 * indistinguishable one-offs for the same role. One token
                 * replaces both.
                 *
                 * For legal/meta text only. Anything a user has to read
                 * comfortably starts at `text-xs`.
                 */
                '2xs': ['0.6875rem', { lineHeight: '1rem' }],
            },
            borderRadius: {
                xl: '0.75rem',
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 2px)',
                sm: 'calc(var(--radius) - 4px)',
                /**
                 * Structural surfaces — panels, plates, listing rows, tables.
                 *
                 * Separate from the `sm`/`md`/`lg` ramp because those follow
                 * `--radius`, which governs the interactive primitives. A
                 * register squares off its plates by moving `--radius-plate`
                 * alone, leaving buttons and inputs rounded so they keep
                 * reading as controls. See `.register-marketing` in tokens.css.
                 */
                plate: 'var(--radius-plate)',
            },
            maxWidth: {
                prose: '62ch',
                editorial: '72rem',
            },
            letterSpacing: {
                editorial: '-0.01em',
                /**
                 * Tracking for uppercase meta text (`MetaLabel`). Two values,
                 * not one per call site: `label` for the dense workspace, where
                 * wide tracking eats a 48px header; `meta` for editorial pages
                 * and the mono marketing layer, which have room to breathe.
                 * Before these existed the same small-caps label shipped at
                 * `tracking-wider`, 0.08em, 0.12em and 0.14em.
                 */
                label: '0.08em',
                meta: '0.12em',
            },
            lineHeight: {
                editorial: '1.25',
            },
            boxShadow: {
                editorial: 'var(--shadow-editorial)',
            },
        },
    },
};
