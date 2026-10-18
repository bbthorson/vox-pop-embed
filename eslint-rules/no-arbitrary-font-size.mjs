/**
 * ESLint rule: vox-pop/no-arbitrary-font-size
 *
 * Enforces `specs/design-system.md` § 6: "Use standard Tailwind only
 * (`text-xs`, `text-sm`, `text-base`, `text-lg`). Never use `text-[Npx]`."
 *
 * An arbitrary size is a one-off by definition — it can't be restyled from the
 * type scale, and two components reaching for `text-[11px]` and `text-[10px]`
 * for the same role is how a scale stops being a scale.
 *
 * Matches only *dimensional* arbitrary values, so `text-[hsl(…)]` and
 * `text-[#fff]` fall through to `no-hardcoded-colors` (which reports them with
 * a color-specific message rather than telling you to use `text-sm`).
 *
 * ## Sanctioned exceptions
 *
 * The spec sanctions two: the Arvo small-caps `PanelHeader` title
 * (`text-[0.8125rem]`) and `StatusBadge` (`text-[10px]`). Both are *tokenized
 * in the primitive* — callers get the treatment by using the component, and
 * never restate the class. That's the bar for an exception, and it's why these
 * are switched off per-file in the consuming eslint configs rather than
 * allowlisted by pattern here: a new exception should require someone to add a
 * named file to a config block and say why.
 *
 * ## On the `text-[10px]` / `text-[11px]` cluster
 *
 * Most current violations are fine print, sitting in the gap below `text-xs`
 * (12px) where the scale simply ends. The fix is a `text-2xs` token in the
 * Tailwind preset, not eleven hand-edits — which is why this rule ships at
 * `warn` while that decision is open.
 */

/**
 * `text-[10px]`, `text-[0.8125rem]`, `text-[13px]`, `text-[length:14px]`.
 *
 * The unit is optional so bare numbers (`text-[14]`) are caught too, but the
 * value must start with a digit or `.` — that's what keeps `text-[hsl(...)]`,
 * `text-[#fff]`, and `text-[var(--x)]` out.
 */
const ARBITRARY_FONT_SIZE = /\btext-\[(?:length:)?\.?\d[\d.]*(?:px|rem|em|pt|ch|ex|vw|vh|%)?\]/;

/** @type {import("eslint").Rule.RuleModule} */
const rule = {
    meta: {
        type: "problem",
        docs: {
            description:
                "Disallow arbitrary Tailwind font sizes (`text-[Npx]`) in favor of the standard type scale. See specs/design-system.md § 6.",
        },
        messages: {
            arbitrarySize:
                "`{{ match }}` is an arbitrary font size. Use the type scale — `text-xs`, `text-sm`, `text-base`, `text-lg`. If the size you need isn't on the scale, add it to the Tailwind preset in packages/design-tokens so every caller gets it, rather than hardcoding one call site. See specs/design-system.md § 6.",
        },
        schema: [],
    },
    create(context) {
        function check(node, value) {
            if (typeof value !== "string" || value.length === 0) return;
            const match = ARBITRARY_FONT_SIZE.exec(value);
            if (match) {
                context.report({ node, messageId: "arbitrarySize", data: { match: match[0] } });
            }
        }

        return {
            Literal(node) {
                check(node, node.value);
            },
            TemplateElement(node) {
                check(node, node.value.cooked);
            },
        };
    },
};

export default rule;
