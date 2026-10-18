/**
 * Shared Framer Motion presets for the dot family (ListenDot, ReplyDot, and
 * apps/web's RecordingContent) and other phase-based UIs.
 *
 * Canonical home: these prop bundles were previously inlined in each dot
 * component (and duplicated in apps/web/src/lib/motion-presets.ts). Centralised
 * here so the motion vocabulary stays consistent across apps/web + apps/embed
 * and updates propagate everywhere. apps/web re-exports these from
 * `@/lib/motion-presets` so its own consumers keep a stable local path.
 *
 * Each export is a bundle of motion props meant to be spread onto a
 * `motion.*` element (e.g. `<motion.div {...phaseTransition} />`), not a
 * Variants map.
 */

/** Standard phase swap — fade + slight scale, used inside AnimatePresence. */
export const phaseTransition = {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9 },
} as const;

/** Mic icon idle breathing — gentle vertical bob. */
export const micBreathing = {
    animate: { y: [0, -3, 0] as number[] },
    transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' as const },
};

/** Primary action button (large, prominent) — e.g. idle mic, main play. */
export const buttonScalePrimary = {
    whileHover: { scale: 1.1 },
    whileTap: { scale: 0.9 },
} as const;

/** Secondary action button (smaller, supporting) — e.g. stop, discard, re-record. */
export const buttonScaleSecondary = {
    whileHover: { scale: 1.05 },
    whileTap: { scale: 0.95 },
} as const;

/**
 * Icon cross-swap inside AnimatePresence — quick scale + fade for trading one
 * glyph for another in place (e.g. ListenDot's play ↔ pause). Shorter and
 * tighter than `phaseTransition` since it's a same-spot glyph swap, not a
 * whole-phase change.
 */
export const iconSwap = {
    initial: { scale: 0.8, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.8, opacity: 0 },
    transition: { duration: 0.15 },
} as const;

/**
 * The product's standard easing, as a Framer Motion bezier array.
 *
 * Same curve as the `--ease-standard` token in
 * `@vox-pop/design-tokens/motion.css` — CSS animations read the token, JS
 * animations read this. Keep the two in step.
 */
export const EASE_STANDARD: [number, number, number, number] = [0.4, 0, 0.2, 1];

/**
 * DotString settle-in — the one-shot wiggle the connector plays when a
 * conversation actually connects (a reply is sent).
 *
 * `scaleY` keyframes with a `transform-origin` at the top edge, so the string
 * drops and swings rather than growing from its centre. It overshoots (1.15)
 * and undershoots (0.92) before resting, which is what makes it read as a
 * physical string with slack rather than a progress bar filling.
 *
 * One-shot on purpose — no `repeat`. See the `animate` prop docs on DotString.
 *
 * No `as const` here (unlike the static presets above): Framer's keyframe types
 * are mutable arrays, and a readonly tuple is not assignable to them. Matches
 * how `micBreathing` and `captureSweep` are written.
 */
export const dotStringSettle = {
    initial: { scaleY: 0.4, opacity: 0 },
    animate: { scaleY: [0.4, 1.15, 0.92, 1] as number[], opacity: [0, 1, 1, 1] as number[] },
    transition: { duration: 0.7, times: [0, 0.55, 0.75, 1], ease: EASE_STANDARD },
};

/**
 * Capture sweep — the live-recording counterpart to ListenDot's playback sweep,
 * spread onto `CaptureSweep`'s rotating wedge.
 *
 * Playback's sweep is *determinate*: it maps `currentTime / duration` onto a
 * filling conic wedge, so the fill angle IS the progress. Capture has no known
 * duration — a take ends when the speaker stops — so there is no fraction to
 * fill. The wedge therefore rotates at a constant rate instead: same circular
 * clock vocabulary, but indeterminate, which is the honest reading. Rotation
 * carries "live"; the opacity breath keeps it from reading as a stalled
 * spinner.
 */
export const captureSweep = {
    // Explicit `[0, 360]` keyframes, not a bare `360`: a bare target animates
    // from the element's CURRENT rotation, so a re-render mid-spin retargets to
    // "wherever we are → 360" over the full duration and the rate visibly
    // stutters. Keyframes pin every cycle to the same 0→360 sweep.
    animate: { rotate: [0, 360], opacity: [0.55, 1, 0.55] as number[] },
    transition: {
        rotate: { duration: 2.4, repeat: Infinity, ease: 'linear' as const },
        opacity: { duration: 1.6, repeat: Infinity, ease: 'easeInOut' as const },
    },
};
