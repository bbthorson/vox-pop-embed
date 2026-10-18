'use client';

import React from 'react';
import { m } from 'framer-motion';
import type { DotMarkTone } from './DotMark';
import { captureSweep } from '../motion';

interface CaptureSweepProps {
    /**
     * Whether capture is actually live. Gate this on the recorder's
     * `isRecording`, NOT on `phase === 'recording'` — the phase flips
     * optimistically on tap while `getUserMedia` is still resolving, and a
     * sweep during that gap would claim the mic is hot before it is.
     */
    active?: boolean;
    /** Follows the host DotMark's tone so the sweep never fights the dot. */
    tone?: DotMarkTone;
    reducedMotion?: boolean;
}

/** DotMark tones → the bare-HSL token each one paints with. */
const TONE_VAR: Record<DotMarkTone, string> = {
    primary: '--primary',
    'accent-warm': '--accent-warm',
    muted: '--ink-subtle',
};

/**
 * CaptureSweep — the "capture is live" treatment inside the dot.
 *
 * Sits in the same box as ListenDot's playback progress fill (`inset-2`, behind
 * the centered control) so capture and playback read as one system: a circular
 * sweep inside the dot means "audio is moving through this dot right now".
 * See the `captureSweep` motion preset for why this one rotates rather than
 * fills.
 *
 * This is a *redundant* cue, not the accessible one — the centered control
 * already swaps to a "Stop recording" button, which is what a screen reader
 * announces. Hence `aria-hidden`.
 *
 * Complements HairlineRipple rather than replacing it: the ripple is
 * amplitude-reactive (it answers "is my voice getting through?") and dies to
 * nothing in a silent room, which is exactly when the user most needs to know
 * the take is still rolling. The sweep is independent of input level, so it
 * holds that signal through the silence.
 */
export function CaptureSweep({
    active = false,
    tone = 'primary',
    reducedMotion = false,
}: CaptureSweepProps) {
    if (!active) return null;

    const v = TONE_VAR[tone];

    // Reduced motion: hold a steady tint. The point of the sweep is "capture is
    // live", so it can't just drop out — that would leave reduced-motion users
    // with the *least* signal. Static presence carries it instead of movement.
    if (reducedMotion) {
        return (
            <div
                aria-hidden="true"
                className="absolute inset-2 rounded-full pointer-events-none"
                style={{ background: `hsl(var(${v}) / 0.12)` }}
            />
        );
    }

    return (
        <div aria-hidden="true" className="absolute inset-2 rounded-full overflow-hidden pointer-events-none">
            {/* Comet wedge: transparent for most of the turn, ramping to its
                densest at the leading edge (360deg). Rotating that reads as a
                sweeping hand rather than a spinning disc. */}
            <m.div
                className="w-full h-full rounded-full"
                style={{
                    background:
                        `conic-gradient(from 0deg,` +
                        ` hsl(var(${v}) / 0) 0deg,` +
                        ` hsl(var(${v}) / 0) 240deg,` +
                        ` hsl(var(${v}) / 0.06) 300deg,` +
                        ` hsl(var(${v}) / 0.22) 358deg,` +
                        ` hsl(var(${v}) / 0) 360deg)`,
                }}
                {...captureSweep}
            />
        </div>
    );
}
