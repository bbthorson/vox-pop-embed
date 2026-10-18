'use client';

import React, { useState } from 'react';
import { AudioDot } from './AudioDot';
import { DotPair } from './DotPair';
import { ReplyDot } from './ReplyDot';
import { EditorialDisplay, EditorialLede, EditorialMeta } from './typography';
import { MotionProvider } from './MotionProvider';
import { DOT_SIZE } from '../dot-metrics';

/**
 * Canonical embed dot size — height-driven (`24dvh`) so the dots fill the
 * vertical space on a phone rather than flooring to a small width-bound size.
 * Lives in `dot-metrics` with the rest of the dot geometry; aliased here
 * because both dots in this file must use the same one.
 */
const EMBED_DOT_SIZE = DOT_SIZE.editorial;

export interface EmbedPromptProps {
    promptId: string;
    title: string;
    description?: string | null;
    /**
     * Playable audio URL — the signed URL the read path already resolved
     * (Antiphony hydrates `embed.url` to a short-lived signed Storage URL, so
     * there is no proxy hop to add here). Omit / null for a text-only prompt.
     */
    audioUrl?: string | null;
    /** Pre-computed waveform peaks for the listen-dot ripple. */
    waveformPeaks?: number[];
    /** Creator handle (shown as `@handle`, and used for the reply handoff). */
    handle?: string;
    /** Creator display name (falls back to handle for the reply host label). */
    displayName?: string;
    /**
     * Origin of the Vox Pop BFF, where `POST /api/v1/audio/upload-pending`
     * lives. Both embed surfaces call it cross-origin — `promptId` is an
     * Antiphony post id, so the upload has to land somewhere that can resolve
     * one. See ReplyDot's `voxPopApiBaseUrl`.
     */
    voxPopApiBaseUrl: string;
    /**
     * Origin of the apps/web host that completes the embed handoff (the
     * top-frame redirect target). See ReplyDot's `hostAppBaseUrl`.
     */
    hostAppBaseUrl: string;
    /**
     * Hard stop for a reply take, in milliseconds — forwarded to `ReplyDot`.
     *
     * Required and undefaulted for the same reason it is there: this package is
     * presentation, and the number is decided in
     * `@vox-pop/shared/types/audio-limits`. Both consumers pass
     * `REPLY_MAX_DURATION_MS`, which is what keeps the embed and the full
     * public page enforcing one limit instead of two.
     */
    maxDurationMs: number;
}

/**
 * EmbedPrompt — the chrome-less, anonymous-only prompt composition rendered
 * inside a narrow iframe (typically 340–480px wide).
 *
 * This is the SINGLE source of the embed layout. Both consumers render it:
 *   - `apps/embed` — the standalone cross-origin Vite bundle
 *     (embed.voxpop.audio), which has no Next.js and no auth.
 *   - the public prompt page's `?mode=embed` branch, served from its own
 *     origin.
 *
 * The full public prompt page (`EditorialPublicPrompt`) is intentionally NOT
 * this component — it's a superset (in-page auth, share, the merged-dot
 * success animation, responsive side-by-side layout) — but it composes the
 * same `@vox-pop/brand-ui` primitives, so the dot design stays consistent.
 *
 * Differences between the two embed surfaces are exactly the props below (the
 * BFF + host origins); everything visual lives here.
 */
export function EmbedPrompt({
    promptId,
    title,
    description,
    audioUrl,
    waveformPeaks,
    handle,
    displayName,
    voxPopApiBaseUrl,
    hostAppBaseUrl,
    maxDurationMs,
}: EmbedPromptProps) {
    // Recording / upload errors surface here, below the dots — the ReplyDot
    // lives inside a round `overflow-hidden` DotMark that clips wide captions,
    // so the status text can't live inside the circle.
    const [replyError, setReplyError] = useState<string | null>(null);

    return (
        /**
         * Self-contained motion features: this component is the whole embed,
         * so it provides its own rather than making apps/embed remember to.
         *
         * The ANIMATION-only subset is correct here and worth ~25 kB gzip on a
         * bundle a creator's site loads on every page view. Nothing in this
         * tree uses layout projection — no `layoutId` is passed to `DotMark`,
         * no `dotLayoutId` to `ReplyDot`, and `MergedDotSuccess` (the one
         * component that needs it) is not reachable from here. If any of that
         * changes, this must become `MotionProviderMax` or the animation will
         * silently do nothing.
         */
        <MotionProvider>
        <div className="theme-editorial relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-background px-4 py-3 text-foreground">
            <div className="w-full max-w-md">
                {/* No LISTEN / REPLY labels — DotMark positions them inside the
                    dot at ~18% from the edge, which collides with the centered
                    mic / play content when dots are under ~170px. Filled-coral
                    vs ring-accent-warm already carries the meaning at narrow
                    iframe widths. */}
                <DotPair
                    listen={
                        <AudioDot
                            className={EMBED_DOT_SIZE}
                            audioUrl={audioUrl}
                            peaks={waveformPeaks}
                            fallback={
                                <div className="px-3 text-center text-xs text-ink-muted">
                                    Text-only prompt
                                </div>
                            }
                        />
                    }
                    reply={
                        <ReplyDot
                            promptId={promptId}
                            hostName={displayName || handle || undefined}
                            creatorHandle={handle || undefined}
                            isEmbed
                            voxPopApiBaseUrl={voxPopApiBaseUrl}
                            hostAppBaseUrl={hostAppBaseUrl}
                            onError={setReplyError}
                            dotClassName={EMBED_DOT_SIZE}
                            maxDurationMs={maxDurationMs}
                        />
                    }
                    between={
                        <div className="flex flex-col items-center gap-1 py-0.5">
                            {handle && <EditorialMeta>@{handle}</EditorialMeta>}
                            {/* Smaller scale than the full-page hero — the embed
                                competes with two dots inside a 340–480px iframe,
                                so 16–24px keeps the title readable without
                                eating vertical space. */}
                            <EditorialDisplay
                                as="h1"
                                className="text-[clamp(1rem,3.5vw+0.5rem,1.5rem)] leading-tight"
                            >
                                {title}
                            </EditorialDisplay>
                            {description && (
                                <EditorialLede className="line-clamp-2 text-xs leading-snug md:text-sm">
                                    {description}
                                </EditorialLede>
                            )}
                        </div>
                    }
                />
                {replyError && (
                    <p role="alert" className="mt-3 text-center text-sm text-destructive">
                        {replyError}
                    </p>
                )}
            </div>
        </div>
        </MotionProvider>
    );
}
