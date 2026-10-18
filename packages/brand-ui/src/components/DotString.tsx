'use client';

import React from 'react';
import { m } from 'framer-motion';
import { cn } from '../utils/cn';
import { dotStringSettle } from '../motion';
import type { DotMarkTone } from './DotMark';

/**
 * Tone → the CSS custom property the stroke reads.
 *
 * `muted` maps to `--rule`, not `--muted`: this is a hairline in the same
 * family as the plain connector it replaces, and `--rule` is the token every
 * other hairline in the editorial register already uses.
 */
const TONE_VAR: Record<DotMarkTone, string> = {
    primary: '--primary',
    'accent-warm': '--accent-warm',
    muted: '--rule',
};

/** `muted` is decoration and stays quiet; the chromatic tones carry meaning. */
const TONE_OPACITY: Record<DotMarkTone, number> = {
    primary: 0.7,
    'accent-warm': 0.7,
    muted: 0.55,
};

interface DotStringProps {
    /** SVG viewBox width. */
    width?: number;
    /** SVG viewBox height. */
    height?: number;
    /**
     * How far the string's midpoint droops.
     *
     * Never 0 — a taut line reads as a generic divider, which is precisely the
     * thing this component exists to stop being. If a screen wants a straight
     * rule, it wants `DotPair`'s default `connector="line"`, not `sag={0}`.
     */
    sag?: number;
    /** Color expression. Shares `DotMark`'s tone vocabulary. */
    tone?: DotMarkTone;
    /**
     * Play the one-shot settle-in wiggle.
     *
     * Deliberately not a looping idle: ambient motion on a connector reads as a
     * loading state. Flip this at a real state change (a reply is sent, a call
     * connects) and let it fire once.
     */
    animate?: boolean;
    /** Dashed = "awaiting" (no reply yet); solid = "connected" (a reply exists). */
    dashed?: boolean;
    className?: string;
}

/**
 * DotString — the tin-can-telephone connector for the two-dot brand system.
 *
 * A gently sagging line between two `DotMark`s. It replaces `DotPair`'s plain
 * hairline on the surfaces where the brand should read as warm and a little
 * unique (the public prompt hero, empty and onboarding states); dashboard
 * contexts keep the flat rule for density. See `specs/design-system.md` § 5 —
 * the sag is what carries the handset / tin-cans-on-a-string reading that the
 * two dots alone only imply.
 *
 * Pure presentation: it holds no state and decides nothing about when to
 * animate. The consumer owns that, because "connected" is a fact about the
 * conversation, not about this SVG.
 */
export function DotString({
    width = 96,
    height = 36,
    sag = 14,
    tone = 'muted',
    animate = false,
    dashed = false,
    className,
}: DotStringProps) {
    // The anchor sits slightly below the top edge so the curve has room to sag
    // inside the box without the stroke clipping at either end.
    const anchorY = height * 0.15;
    const path = `M3,${anchorY} Q${width / 2},${anchorY + sag} ${width - 3},${anchorY}`;

    return (
        <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className={cn('block overflow-visible', className)}
            // Decorative: the connector restates the relationship the two dots
            // and their labels already announce, so it is noise to a screen
            // reader rather than information.
            aria-hidden="true"
            focusable="false"
        >
            <m.path
                d={path}
                stroke={`hsl(var(${TONE_VAR[tone]}) / ${TONE_OPACITY[tone]})`}
                strokeWidth={2}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={dashed ? '1 7' : undefined}
                style={{ transformOrigin: '50% 0%' }}
                {...(animate ? dotStringSettle : {})}
            />
        </svg>
    );
}
