'use client';

import { LazyMotion, domMax } from 'framer-motion';
import type { ReactNode } from 'react';

/**
 * LazyMotion feature provider — the full DOM feature set, including layout
 * projection (`layout`, `layoutId`, shared-element transitions).
 *
 * Needed by any tree that renders `DotMark` with a `layoutId`, `ReplyDot` with
 * `dotLayoutId`, or `MergedDotSuccess` (whose `layoutId="merged-dot"` is the
 * shared-element handoff the success animation is built on). apps/public's
 * prompt page does all three; apps/web's dashboard panels render the same
 * primitives.
 *
 * This is roughly the size of plain framer-motion, so it buys no bundle
 * saving on its own — it exists so `m.*` works in those apps. The saving is
 * real only where `MotionProvider` (animation-only) can be used instead, which
 * today means apps/embed.
 *
 * Separate module from `MotionProvider` on purpose: one file importing both
 * `domAnimation` and `domMax` would bundle both everywhere.
 */
export function MotionProviderMax({ children }: { children: ReactNode }) {
    return <LazyMotion features={domMax}>{children}</LazyMotion>;
}
