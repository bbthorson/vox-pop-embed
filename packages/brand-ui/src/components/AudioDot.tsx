'use client';

import React, { useState } from 'react';
import { DotMark, type DotMarkVariant, type DotMarkTone } from './DotMark';
import { ListenDot, type ListenDotMediaSession } from './ListenDot';

export interface AudioDotProps {
    /**
     * Audio to play. When absent, `fallback` renders inside the dot instead —
     * a text-only prompt still needs its circle.
     */
    audioUrl?: string | null;
    /** Pre-computed waveform peaks; drives the HairlineRipple during playback. */
    peaks?: number[];
    /** Lockscreen / media-key metadata. Omit on public pages. */
    mediaSession?: ListenDotMediaSession;
    /** Accessible name for the play control — "Play {subject}". */
    subject?: string;
    /**
     * Rendered in place of the player when there's no `audioUrl`. Omit to get
     * an empty dot (callers that hide the whole section for audio-less records
     * never reach this).
     */
    fallback?: React.ReactNode;
    /** See `ListenDot` — progress sink, end-of-clip hook, and autoplay. */
    onProgress?: (progress: number, isPlaying: boolean) => void;
    onEnded?: () => void;
    autoPlay?: boolean;

    // ── DotMark passthrough ──────────────────────────────────────────────
    /** Defaults to `filled` — a listen dot always means "content lives here". */
    variant?: DotMarkVariant;
    tone?: DotMarkTone;
    /** Explicit pixel diameter. Prefer `className` with a `DOT_SIZE` preset. */
    size?: number;
    className?: string;
    label?: string;
    labelPosition?: 'top' | 'bottom';
    layoutId?: string;
}

/**
 * AudioDot — a `DotMark` with a `ListenDot` inside it.
 *
 * Every consumer of `ListenDot` was wrapping it by hand, and three of the four
 * repeated the same `variant="filled" tone="primary"` pair plus a re-typed
 * size. `ListenDot` can't just render its own `DotMark`, though: the editorial
 * surfaces swap the player for a "Text-only prompt" note inside the same
 * circle, so the dot has to outlive the player. This composite owns that
 * choice — player or `fallback`, one circle either way.
 *
 * `ReplyDot` stays the deliberate exception and keeps its own `DotMark`: its
 * review-phase discard/send buttons sit OUTSIDE the circle, and `DotMark` is
 * `overflow-hidden`, so they can't be its children.
 */
export function AudioDot({
    audioUrl,
    peaks,
    mediaSession,
    subject,
    fallback,
    onProgress,
    onEnded,
    autoPlay,
    variant = 'filled',
    tone = 'primary',
    size,
    className,
    label,
    labelPosition,
    layoutId,
}: AudioDotProps) {
    const [playbackError, setPlaybackError] = useState<string | null>(null);

    return (
        // `relative` + an absolutely-positioned notice: the wrapper measures
        // exactly the dot, so adding it doesn't move anything in the layouts
        // that place these (DotPair, the detail panels' centered columns).
        <div className="relative">
            <DotMark
                variant={variant}
                tone={tone}
                size={size}
                className={className}
                label={label}
                labelPosition={labelPosition}
                layoutId={layoutId}
            >
                {audioUrl ? (
                    <ListenDot
                        audioUrl={audioUrl}
                        peaks={peaks}
                        mediaSession={mediaSession}
                        subject={subject}
                        onError={setPlaybackError}
                        onProgress={onProgress}
                        onEnded={onEnded}
                        autoPlay={autoPlay}
                    />
                ) : (
                    fallback
                )}
            </DotMark>

            {/* Rendered here rather than inside ListenDot because DotMark is
                `overflow-hidden` — a notice below the dot is clipped from in
                there. Absolute so a failure never reflows the dot. */}
            {playbackError && (
                <p
                    role="status"
                    className="absolute left-1/2 top-full z-10 mt-3 w-max max-w-[16rem] -translate-x-1/2 text-center text-sm text-muted-foreground"
                >
                    {playbackError}
                </p>
            )}
        </div>
    );
}
