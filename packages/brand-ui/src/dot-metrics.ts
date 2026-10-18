/**
 * Shared geometry for the dot family (`ListenDot`, `ReplyDot`, `AudioDot`).
 *
 * Both dots landed their control sizes independently in the same "Bug 4"
 * pass and drifted apart — ListenDot on a 64px glyph, ReplyDot on 80px
 * buttons with 36px icons and a 64px review button with its own icon size.
 * Now that ReplyDot's review phase renders a real `ListenDot`, the two
 * components share one screen at the same moment, so the numbers have to
 * come from one place.
 */

/**
 * Diameter (px) of the primary in-dot action button — ReplyDot's record and
 * stop controls. Sized so the central control doesn't jump between phases.
 */
export const DOT_PRIMARY_CONTROL = 80;

/** Icon size (px) inside {@link DOT_PRIMARY_CONTROL}. */
export const DOT_PRIMARY_ICON = 36;

/** Icon size (px) for the stop glyph — a square reads heavier than a mic. */
export const DOT_STOP_ICON = 28;

/**
 * Largest playback glyph (px). `ListenDot` renders its play/pause icon bare
 * (no button chrome), so the glyph *is* the touch target.
 */
export const DOT_PLAYBACK_ICON_MAX = 64;

/** Smallest playback glyph (px) — floor for narrow embeds and preview dots. */
export const DOT_PLAYBACK_ICON_MIN = 40;

/** Share of the dot's diameter the playback glyph occupies before clamping. */
const PLAYBACK_ICON_RATIO = 0.4;

/**
 * Playback glyph size for a dot of `dotSize` px.
 *
 * Proportional rather than fixed so the glyph survives contexts smaller than
 * the ~160px minimum ListenDot shipped against. Every current call site
 * measures ≥160px and therefore still gets the historical 64px; ReplyDot's
 * review preview and any future compact dot scale down instead of overflowing
 * the circle.
 *
 * `dotSize` is 0 on the first paint (before `useContainerSize`'s
 * ResizeObserver fires) — fall back to the max rather than rendering an
 * invisible icon.
 */
export function playbackIconSize(dotSize: number): number {
    if (!dotSize) return DOT_PLAYBACK_ICON_MAX;
    return Math.round(
        Math.min(DOT_PLAYBACK_ICON_MAX, Math.max(DOT_PLAYBACK_ICON_MIN, dotSize * PLAYBACK_ICON_RATIO)),
    );
}

/**
 * Left margin (px) that optically centers Lucide's `Play` triangle.
 *
 * The glyph's visual centroid sits right of its bounding-box center by
 * roughly a sixth of the icon size, so the correction has to scale with the
 * icon — the previous hardcoded `ml-2` / `ml-0.5` classes were two different
 * approximations of this one number.
 */
export function playGlyphOffset(iconSize: number): number {
    return Math.round(iconSize / 6);
}

/**
 * Canonical dot diameters, as Tailwind class strings.
 *
 * Kept here so the three consumers that render a listen dot stop retyping the
 * same `size-[clamp(...)]` expression. NOTE for anyone editing these: Tailwind
 * regex-greps source (apps/web, apps/embed) or built dist (apps/public) for
 * class names, so these MUST stay whole literal strings — never assembled from
 * fragments, or the utilities get purged.
 */
export const DOT_SIZE = {
    /** Dashboard detail panels — fixed 160px. */
    panel: 'w-40 h-40',
    /** Editorial surfaces on a narrow viewport (embed iframe, mobile). */
    editorial: 'size-[clamp(10rem,24dvh,15rem)]',
    /** Editorial surfaces that go side-by-side on md+ (the public prompt page). */
    editorialWide: 'size-[clamp(10rem,24dvh,15rem)] md:size-[clamp(12rem,22dvmin,18rem)]',
} as const;
