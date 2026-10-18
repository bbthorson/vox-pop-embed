/**
 * Vox Pop design tokens — parallel TypeScript export of the same values
 * defined in `tokens.css`.
 *
 * Use this when CSS variables aren't available — e.g., Canvas rendering
 * (the `HairlineRipple` audio visualizer paints into a 2D canvas and can't
 * read CSS var values without a layout pass), or dark-mode-aware JS
 * logic (theme toggle that needs to read the active value rather than
 * defer to the cascade).
 *
 * Keep this file in lockstep with `tokens.css`. The values must match
 * exactly — a vitest snapshot would be nice as a guard, but for now
 * the convention is "if you change a value, change it in both files".
 *
 * Values are stored as the bare HSL fragment expected by Tailwind's
 * `hsl(var(--token))` consumption pattern. To get a usable color
 * string, wrap with `hsl(...)`:
 *
 *   const primary = `hsl(${lightTokens.primary})`;
 *   // → "hsl(12 92% 58%)"
 *
 * Shadows are stored as their full CSS value (multi-stop with hsl
 * function calls already embedded).
 */

export interface TokenSet {
    background: string;
    foreground: string;
    card: string;
    cardForeground: string;
    popover: string;
    popoverForeground: string;
    primary: string;
    primaryForeground: string;
    secondary: string;
    secondaryForeground: string;
    muted: string;
    mutedForeground: string;
    accent: string;
    accentForeground: string;
    destructive: string;
    destructiveForeground: string;
    border: string;
    input: string;
    ring: string;
    radius: string;
    /**
     * Radius for STRUCTURAL surfaces — panels, plates, listing rows, tables —
     * as opposed to `radius`, which governs the interactive primitives.
     *
     * The two are held apart so a register can square off its surfaces without
     * squaring off its controls: a squared button stops reading as a button.
     * apps/public's marketing sub-register (`.register-marketing`) takes this
     * to `0rem` and leaves `radius` alone.
     */
    radiusPlate: string;

    success: string;
    successForeground: string;
    warning: string;
    warningForeground: string;
    info: string;
    infoForeground: string;

    /**
     * Modal/sheet scrim. Deliberately near-black in BOTH schemes — a scrim's
     * job is to suppress what's behind it, so it does not invert with the
     * theme the way a surface does. Consumed with an alpha modifier
     * (`bg-overlay/80`), never solid.
     */
    overlay: string;
    /** Text/icons drawn directly on a scrim (e.g. an avatar hover affordance). */
    overlayForeground: string;

    surfaceRaised: string;
    surfaceSunken: string;
    inkStrong: string;
    inkMuted: string;
    inkSubtle: string;
    accentWarm: string;
    rule: string;
    shadowEditorial: string;
}

/**
 * Light, workspace register (`:root`).
 *
 * Shares the editorial register's hue family and ink ramp — the neutrals are
 * warm (hue 20–36) rather than the cool navy/slate they used to be, and the
 * accent is editorial's calmer gold. What stays workspace-specific is *density
 * character*, not color: a brighter working surface than editorial's paper
 * (99% vs 97%), a lighter `muted`, and the tighter 0.75rem radius.
 *
 * The warm ink ramp is also what closed audit finding D7. `mutedForeground` at
 * 46.9% cool grey measured 4.75 on white — under AA before any row tint was
 * applied, which is why the selected-row tint had nowhere to go. At 38% warm it
 * measures 6.16 on the list pane, so the `/10` hover and `/15` selection tints
 * now land at 5.73 and 5.52. See § 7 of specs/design-system.md.
 */
export const lightTokens: TokenSet = {
    background: '36 30% 99%',
    foreground: '20 20% 14%',
    card: '0 0% 100%',
    cardForeground: '20 20% 14%',
    popover: '0 0% 100%',
    popoverForeground: '20 20% 14%',
    // 44% is the lightest coral that clears AA on all three grounds it has to
    // sit on: white text over it (4.95), and the coral itself as link/icon text
    // over the workspace page (4.85) and editorial paper (4.66). At the old 55%
    // those were 3.57 / 3.50 / 3.36 — every one of them short.
    primary: '12 86% 44%',
    primaryForeground: '0 0% 100%',
    secondary: '30 25% 96%',
    secondaryForeground: '20 20% 14%',
    muted: '30 25% 96%',
    mutedForeground: '25 12% 38%',
    accent: '32 70% 62%',
    // Dark ink, not white. White on this accent measures 2.20 — the trap
    // documented in D7. Warm near-black measures 7.60, which is what makes a
    // solid `bg-accent` fill safe to use at all.
    accentForeground: '20 25% 12%',
    destructive: '0 84.2% 60.2%',
    destructiveForeground: '0 0% 100%',
    border: '28 22% 88%',
    // Control boundaries only. Held apart from `border` on purpose: `border`
    // draws the decorative hairlines the dense lists are built on
    // (`border-b border-border/50`), which want to stay quiet, while a control
    // edge has to clear WCAG 1.4.11's 3:1 to identify the control at all.
    // 52% is the lightest value doing that on every ground — the tightest is
    // editorial's sunken surface, at 3.12.
    input: '28 22% 52%',
    ring: '12 86% 44%',
    radius: '0.75rem',
    radiusPlate: '0.75rem',

    success: '158 64% 42%',
    successForeground: '158 64% 97%',
    warning: '38 92% 50%',
    warningForeground: '48 96% 89%',
    info: '199 89% 48%',
    infoForeground: '204 94% 94%',

    overlay: '20 25% 8%',
    overlayForeground: '0 0% 100%',

    surfaceRaised: '0 0% 100%',
    surfaceSunken: '30 25% 94%',
    inkStrong: '20 25% 12%',
    inkMuted: '25 14% 32%',
    inkSubtle: '25 14% 42%',
    accentWarm: '20 75% 55%',
    rule: '28 18% 78%',
    shadowEditorial:
        '0 6px 24px -8px hsl(20 15% 15% / 0.08), 0 2px 6px -2px hsl(20 15% 15% / 0.04)',
};

/**
 * Dark, workspace register (`.dark`).
 *
 * Warm espresso rather than the deep navy it used to be, matching the editorial
 * dark register's family. It stays a step deeper than editorial throughout
 * (7% page vs 9%, 12% raised vs 14%) — a dense two-pane dashboard needs more
 * separation between the ground and the panels floating on it than a single
 * column of prose does.
 */
export const darkTokens: TokenSet = {
    background: '24 14% 7%',
    foreground: '32 28% 92%',
    card: '24 14% 10%',
    cardForeground: '32 28% 92%',
    popover: '24 14% 10%',
    popoverForeground: '32 28% 92%',
    primary: '14 88% 62%',
    primaryForeground: '0 0% 10%',
    secondary: '24 14% 14%',
    secondaryForeground: '32 28% 92%',
    muted: '24 14% 14%',
    mutedForeground: '32 14% 65%',
    accent: '20 55% 55%',
    // Same reasoning as the light register: dark ink on the accent (5.00)
    // rather than white (1.90).
    accentForeground: '20 25% 12%',
    destructive: '0 62.8% 45%',
    destructiveForeground: '210 40% 98%',
    border: '24 14% 20%',
    // 44% — tightest ground is editorial dark's raised surface, at 3.17.
    input: '24 14% 44%',
    ring: '14 88% 62%',
    radius: '0.75rem',
    radiusPlate: '0.75rem',

    success: '158 60% 50%',
    successForeground: '158 60% 97%',
    warning: '38 92% 56%',
    warningForeground: '48 96% 12%',
    info: '199 89% 56%',
    infoForeground: '204 94% 12%',

    overlay: '20 25% 4%',
    overlayForeground: '0 0% 100%',

    surfaceRaised: '24 14% 12%',
    surfaceSunken: '24 14% 5%',
    inkStrong: '32 28% 94%',
    inkMuted: '32 16% 72%',
    inkSubtle: '32 12% 52%',
    accentWarm: '20 70% 60%',
    rule: '24 14% 24%',
    shadowEditorial:
        '0 6px 24px -8px hsl(0 0% 0% / 0.4), 0 2px 6px -2px hsl(0 0% 0% / 0.3)',
};

/**
 * Light, editorial register (`.theme-editorial`). Public pages, warm paper.
 *
 * Fields marked `inherited from :root` reference `lightTokens` instead
 * of duplicating literals — the CSS rule doesn't redefine `--destructive`
 * etc., so the cascaded value comes from `:root` at runtime. Referencing
 * the parent here keeps the TS constants in lockstep with that behavior
 * automatically.
 */
export const editorialTokens: TokenSet = {
    background: '34 36% 97%',
    foreground: '20 20% 14%',
    card: '0 0% 100%',
    cardForeground: '20 20% 14%',
    popover: '0 0% 100%',
    popoverForeground: '20 20% 14%',
    primary: '12 86% 44%',
    primaryForeground: '0 0% 100%',
    secondary: '30 30% 94%',
    secondaryForeground: '20 20% 14%',
    muted: '30 25% 94%',
    mutedForeground: '25 12% 38%',
    accent: '32 70% 62%',
    accentForeground: '20 25% 12%',
    destructive: lightTokens.destructive, // inherited from :root — editorial doesn't redefine
    destructiveForeground: lightTokens.destructiveForeground,
    border: '28 22% 88%',
    // Control boundaries only. Held apart from `border` on purpose: `border`
    // draws the decorative hairlines the dense lists are built on
    // (`border-b border-border/50`), which want to stay quiet, while a control
    // edge has to clear WCAG 1.4.11's 3:1 to identify the control at all.
    // 52% is the lightest value doing that on every ground — the tightest is
    // editorial's sunken surface, at 3.12.
    input: '28 22% 52%',
    ring: '12 86% 44%',
    radius: '1rem',
    radiusPlate: '1rem',

    success: lightTokens.success, // inherited from :root
    successForeground: lightTokens.successForeground,
    warning: lightTokens.warning,
    warningForeground: lightTokens.warningForeground,
    info: lightTokens.info,
    infoForeground: lightTokens.infoForeground,

    overlay: lightTokens.overlay, // inherited from :root — scrims are register-agnostic
    overlayForeground: lightTokens.overlayForeground,

    surfaceRaised: '0 0% 100%',
    surfaceSunken: '30 25% 94%',
    inkStrong: '20 25% 12%',
    inkMuted: '25 14% 32%',
    // Darkened from 55% (3.13:1 on the warm-paper background — failed AA for
    // the 12px EditorialMeta labels) to 42% (4.96:1). tokens.css carried this
    // fix; this twin was left behind until the lockstep test caught it.
    inkSubtle: '25 14% 42%',
    accentWarm: '20 75% 55%',
    rule: '28 18% 78%',
    shadowEditorial:
        '0 6px 24px -8px hsl(20 15% 15% / 0.08), 0 2px 6px -2px hsl(20 15% 15% / 0.04)',
};

/**
 * Dark, editorial register (`.dark .theme-editorial`). Newsprint on espresso.
 *
 * Same inheritance pattern as `editorialTokens`: fields the CSS rule
 * doesn't redefine (`destructive`, `success`, etc.) cascade from
 * `.dark` at runtime, so the TS export references `darkTokens` here.
 * `radius` references `editorialTokens` because the dark-editorial CSS
 * rule doesn't redefine it — it cascades from `.theme-editorial`'s
 * `--radius: 1rem`.
 */
export const darkEditorialTokens: TokenSet = {
    background: '24 14% 9%',
    foreground: '32 28% 92%',
    card: '24 14% 12%',
    cardForeground: '32 28% 92%',
    popover: '24 14% 12%',
    popoverForeground: '32 28% 92%',
    primary: '14 88% 62%',
    primaryForeground: '0 0% 10%',
    secondary: '24 14% 14%',
    secondaryForeground: '32 28% 92%',
    muted: '24 14% 14%',
    mutedForeground: '32 14% 65%',
    accent: '20 55% 55%',
    accentForeground: '20 25% 12%',
    destructive: darkTokens.destructive, // inherited from .dark
    destructiveForeground: darkTokens.destructiveForeground,
    border: '24 14% 20%',
    // 44% — tightest ground is editorial dark's raised surface, at 3.17.
    input: '24 14% 44%',
    ring: '14 88% 62%',
    radius: editorialTokens.radius, // inherited from .theme-editorial
    radiusPlate: editorialTokens.radiusPlate, // inherited, same rule as radius

    success: darkTokens.success, // inherited from .dark
    successForeground: darkTokens.successForeground,
    warning: darkTokens.warning,
    warningForeground: darkTokens.warningForeground,
    info: darkTokens.info,
    infoForeground: darkTokens.infoForeground,

    overlay: darkTokens.overlay, // inherited from .dark
    overlayForeground: darkTokens.overlayForeground,

    surfaceRaised: '24 14% 14%',
    surfaceSunken: '24 14% 7%',
    inkStrong: '32 28% 94%',
    inkMuted: '32 16% 72%',
    inkSubtle: '32 12% 52%',
    accentWarm: '20 70% 60%',
    rule: '24 14% 24%',
    shadowEditorial:
        '0 6px 24px -8px hsl(0 0% 0% / 0.4), 0 2px 6px -2px hsl(0 0% 0% / 0.3)',
};
