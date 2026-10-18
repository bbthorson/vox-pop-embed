/**
 * ESLint rule: vox-pop/no-hardcoded-colors
 *
 * Enforces `specs/design-system.md` § 6: every color in a component comes from
 * the token foundation (`packages/design-tokens`), consumed as a semantic
 * Tailwind class (`text-primary`, `bg-success`, `border-rule`, …).
 *
 * Four things get flagged, all of which bypass the tokens:
 *
 *   1. Tailwind's stock palette   — `text-green-600`, `bg-red-500/10`
 *   2. Absolute black/white       — `bg-white`, `text-black`
 *   3. Arbitrary color values     — `bg-[hsl(34_36%_97%)]`, `text-[#F65831]`
 *   4. Bare hex color strings     — `const c = '#F65831'`
 *
 * Why this matters beyond tidiness: a hardcoded value can't participate in the
 * light/dark swap or in the `.theme-editorial` overlay, so it silently renders
 * the wrong thing in three of the four register × scheme combinations. That is
 * exactly how `ProfilePreview` ended up shipping warm-paper literals onto a
 * dark settings page.
 *
 * Detection is on string literals and template-literal chunks anywhere in the
 * file, not just on `className={...}`. That's deliberate — class strings
 * legitimately live inside `cn(...)`, `cva(...)` variant maps, and plain
 * `const` lookup tables, and all of them should be covered.
 *
 * Escape hatches, in order of preference:
 *   - a semantic token (almost always the right answer)
 *   - `ignores` on a config block, for vendored upstream code
 *   - `eslint-disable-next-line` + a comment, for the genuine cases where CSS
 *     variables can't resolve: browser `theme-color` metadata, Canvas
 *     fallbacks. See "Canvas and CSS Variables" in the spec.
 */

// Tailwind's stock palette families. `--primary` here is warm coral and
// `--accent` golden orange; reaching for `blue-500` means the component has
// opted out of the brand entirely.
const PALETTE_FAMILIES = [
    "slate", "gray", "zinc", "neutral", "stone",
    "red", "orange", "amber", "yellow", "lime",
    "green", "emerald", "teal", "cyan", "sky",
    "blue", "indigo", "violet", "purple", "fuchsia",
    "pink", "rose",
].join("|");

// Utilities that take a color. `shadow` and `ring` included because a
// hardcoded shadow color drifts from `--shadow-editorial` the same way.
const COLOR_UTILITIES = [
    "text", "bg", "border", "ring", "fill", "stroke",
    "from", "to", "via", "decoration", "outline", "shadow",
    "accent", "caret", "divide", "placeholder",
].join("|");

/** `text-green-600`, `dark:bg-red-500/10`, `hover:border-sky-300` */
const PALETTE_CLASS = new RegExp(
    `\\b(?:${COLOR_UTILITIES})-(?:${PALETTE_FAMILIES})-(?:50|\\d{3})\\b`,
);

/** `bg-white`, `text-black`, `border-white/20` — absolute, so never theme-aware. */
const ABSOLUTE_CLASS = new RegExp(`\\b(?:${COLOR_UTILITIES})-(?:white|black)\\b`);

/** `bg-[hsl(34_36%_97%)]`, `text-[#F65831]`, `border-[rgb(0,0,0)]` */
const ARBITRARY_COLOR_CLASS = new RegExp(
    `\\b(?:${COLOR_UTILITIES})-\\[(?:#|hsla?\\(|rgba?\\(|oklch\\(|lab\\()`,
);

/**
 * A string that is *entirely* a hex color: `'#fff'`, `'#F65831'`, `'#0A0F1Aff'`.
 * Anchored on purpose — an unanchored match would flag every `PR #514` and
 * `React #418` reference in the prose we write in comments and error messages.
 */
const BARE_HEX = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

/** @type {import("eslint").Rule.RuleModule} */
const rule = {
    meta: {
        type: "problem",
        docs: {
            description:
                "Require colors to come from the design tokens rather than Tailwind's stock palette, absolute black/white, arbitrary color values, or bare hex literals. See specs/design-system.md § 6.",
        },
        messages: {
            paletteClass:
                "`{{ match }}` uses Tailwind's stock palette instead of a design token. Use the semantic class for the role — `text-success`, `bg-destructive`, `text-warning`, `border-rule` — so the color follows light/dark and the editorial register. See specs/design-system.md § 6.",
            absoluteClass:
                "`{{ match }}` is an absolute color and can't respond to the theme. Use `bg-background` / `text-foreground` / `bg-surface-raised` (or `--ink-*` on editorial surfaces) instead. See specs/design-system.md § 6.",
            arbitraryColorClass:
                "`{{ match }}` hardcodes a color value. Every palette value lives in packages/design-tokens — use the token (`bg-surface-sunken`, `text-ink-strong`, `border-rule`, …) rather than restating its HSL. See specs/design-system.md § 1.",
            bareHex:
                "Hex color `{{ match }}` is hardcoded. Import `lightTokens`/`darkTokens` from `@vox-pop/design-tokens/tokens`, or read the CSS variable at runtime. If this is a Canvas fallback or browser `theme-color` metadata — the two places a CSS variable genuinely can't resolve — disable the rule on this line with a comment saying which. See specs/design-system.md § 5 \"Canvas and CSS Variables\".",
        },
        schema: [],
    },
    create(context) {
        /** Report the first pattern that hits, so one bad class isn't four errors. */
        function check(node, value) {
            if (typeof value !== "string" || value.length === 0) return;

            const palette = PALETTE_CLASS.exec(value);
            if (palette) {
                context.report({ node, messageId: "paletteClass", data: { match: palette[0] } });
                return;
            }

            const absolute = ABSOLUTE_CLASS.exec(value);
            if (absolute) {
                context.report({ node, messageId: "absoluteClass", data: { match: absolute[0] } });
                return;
            }

            const arbitrary = ARBITRARY_COLOR_CLASS.exec(value);
            if (arbitrary) {
                context.report({
                    node,
                    messageId: "arbitraryColorClass",
                    data: { match: arbitrary[0] },
                });
                return;
            }

            if (BARE_HEX.test(value.trim())) {
                context.report({ node, messageId: "bareHex", data: { match: value.trim() } });
            }
        }

        return {
            Literal(node) {
                check(node, node.value);
            },
            // Template chunks: `` `flex ${x} bg-white` `` — lint the static parts.
            TemplateElement(node) {
                check(node, node.value.cooked);
            },
        };
    },
};

export default rule;
