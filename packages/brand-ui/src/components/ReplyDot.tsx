'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { m, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Mic, Square, Send, X, Loader2 } from 'lucide-react';
import { useAudioRecorder } from '@antiphony/capture-kit';
import { setAudioSessionType } from '../utils/audio-session';
import { recorderErrorMessage } from '../recorder-copy';
import { useContainerSize } from '../hooks/use-container-size';
import { HairlineRipple } from './HairlineRipple';
import { CaptureSweep } from './CaptureSweep';
import { DotMark, type DotMarkVariant, type DotMarkTone } from './DotMark';
import { ListenDot } from './ListenDot';
import { DOT_PRIMARY_CONTROL, DOT_PRIMARY_ICON, DOT_STOP_ICON } from '../dot-metrics';
import {
    phaseTransition,
    micBreathing,
    buttonScalePrimary,
    buttonScaleSecondary,
} from '../motion';
import type { AuthProvider, AudioUploader, DotsAuthGate } from '../ports';

type ReplyPhase = 'idle' | 'recording' | 'review' | 'authenticating' | 'sending' | 'success';

/**
 * How much the dot shrinks in the `review` phase to make room for the two
 * flanking action buttons (discard / send) that sit just outside it. Smaller
 * than 1 so the dot + flanks stay within a phone's width — the original
 * "three buttons crammed inside the circle" layout had no such headroom.
 */
const REVIEW_DOT_SCALE = 0.72;
/** Gap (px) between the shrunken dot's edge and each flanking button. */
const REVIEW_FLANK_GAP = 12;

interface ReplyDotProps {
    promptId: string;
    hostName?: string;
    /** Whether this is running inside an off-site embed */
    isEmbed?: boolean;
    /**
     * Creator handle — required in embed mode so we can redirect the
     * top frame to the prompt page after the pending upload lands.
     */
    creatorHandle?: string;
    /**
     * Auth layer. Required for the on-domain path (`isEmbed === false`);
     * pass `null` (or omit) in embed contexts — the embed path uploads
     * anonymously and never touches auth state.
     *
     * Preparing this prop for the `packages/brand-ui/` extraction —
     * see `./ports.ts` for the rationale.
     */
    auth?: AuthProvider | null;
    /**
     * Storage uploader. Required for the on-domain path; pass `null`
     * (or omit) in embed contexts — the embed path uses plain `fetch`
     * to `/api/v1/audio/upload-pending`, never the storage helper.
     */
    uploader?: AudioUploader | null;
    /**
     * Orchestration for the OTP sheet + merge animation. Required for
     * the on-domain path; pass `null` (or omit) in embed contexts.
     */
    authGate?: DotsAuthGate | null;
    /**
     * When the merge state on the auth gate transitions back to `null`
     * (user clicked "Send another"), reset this component back to the
     * idle phase. Optional — embed contexts don't have a merge state
     * machine and can skip this. The on-domain caller reads
     * `authGate.mergeState` and passes it here.
     */
    mergeStateSignal?: { phase: 'merging' | 'merged'; isNewUser: boolean } | null;
    /**
     * Origin of the Vox Pop BFF, where `POST /api/v1/audio/upload-pending`
     * lives. The embed-mode flow does an anonymous fetch to it with the
     * recorded audio.
     *
     * Required for the embed path; ignored on the on-domain path (which uses
     * the `uploader` adapter instead).
     *
     * No trailing slash — appended path is `/api/v1/audio/upload-pending`.
     */
    voxPopApiBaseUrl?: string;
    /**
     * Optional sink for recording / upload status errors. When provided, the
     * consumer owns the error display (rendered OUTSIDE the circular `DotMark`,
     * which is `overflow-hidden` and clips wide text) and the in-circle caption
     * is suppressed. When omitted, ReplyDot falls back to rendering the message
     * inside the dot — fine for the larger on-domain recording surfaces, but it
     * clips in the small embed dots, which is why the embed passes this.
     *
     * Fires with `null` when the error clears so the consumer can hide its
     * message.
     */
    onError?: (message: string | null) => void;
    /**
     * Origin of the apps/web host that completes the embed handoff —
     * the top-frame redirect target after a pending upload. The URL is
     * constructed as `${hostAppBaseUrl}/@${creatorHandle}/${promptId}?pending=...`
     * and `window.top.location.href` is set to it.
     *
     * Required for the embed path. The standalone apps/embed app
     * passes the public prompt page's origin (`https://voxpop.audio` in
     * production); the prompt page embedding itself passes its own origin.
     */
    hostAppBaseUrl?: string;
    /**
     * Sizing classes for the dot circle (e.g. `size-[clamp(...)]`).
     *
     * ReplyDot owns its own `DotMark` so the `review`-phase action buttons
     * (discard / send) can render OUTSIDE the circle — the `DotMark` is
     * `overflow-hidden`, so anything that needs to escape the circle can't be
     * its child. Consumers therefore pass the dot's presentation here rather
     * than wrapping `<DotMark><ReplyDot/></DotMark>`.
     */
    dotClassName?: string;
    /**
     * Small-caps label rendered inside the dot (e.g. "REPLY"). The full
     * editorial page passes this; the narrow embed omits it (the label
     * collides with the centered content under ~170px — see PublicPrompt).
     */
    dotLabel?: string;
    /**
     * Framer `layoutId` forwarded to the dot. The full page passes
     * `"reply-dot"` so the dot participates in the merge animation; the embed
     * omits it.
     */
    dotLayoutId?: string;
    /** Dot visual treatment — reply dots are a warm ring by default. */
    dotVariant?: DotMarkVariant;
    dotTone?: DotMarkTone;
    /**
     * Hard stop for a take, in milliseconds. The kit auto-stops at the limit
     * rather than refusing to continue, so the responder keeps what they said —
     * the alternative is bouncing the upload afterwards, which loses all of it.
     *
     * **Required, and deliberately not defaulted.** Callers pass
     * `REPLY_MAX_DURATION_MS` from `@vox-pop/shared/types/audio-limits`, which
     * is where the number is decided; a default here would be a second answer.
     */
    maxDurationMs: number;
}

/**
 * ReplyDot — Recording interface designed for the circular dot container.
 *
 * Simplified flow:
 * - idle: Mic icon centered
 * - recording: CaptureSweep rotates inside the dot + HairlineRipple pulses
 *   around it, single stop button centered
 * - review: the dot shrinks and hands its interior to a `ListenDot` — the same
 *   playback component the creator's side uses, so the preview gets the
 *   progress sweep and the play()-rejection handling for free. Discard (X,
 *   left) and send (→, right) flank the dot — OUTSIDE the circle, so the
 *   cramped "three buttons inside the dot" layout is gone. The dot itself
 *   therefore only ever shows record (idle/recording) or play (review).
 * - authenticating: Auth gate shown in connection area (via context)
 * - sending: Loading spinner
 * - success: Check mark with "send another" link
 *
 * ReplyDot owns its own `DotMark` (consumers pass `dotClassName` / `dotLabel`
 * / `dotLayoutId` rather than wrapping it) precisely so the review-phase flank
 * buttons can live outside the `overflow-hidden` circle.
 *
 * The HairlineRipple visualizer extends beyond the dot edge during recording,
 * creating concentric hairline rings that emanate from the circle.
 */

/**
 * What the embed tells a visitor whose upload was refused with a 404: the
 * prompt exists no longer for the public (archived, or hidden by an operator),
 * or never did. The API answers all of those the same way on purpose, so the
 * copy does not try to tell them apart.
 */
export const PROMPT_CLOSED_MESSAGE = 'This prompt isn’t taking replies any more.';

export function ReplyDot({
    promptId,
    hostName = 'the creator',
    isEmbed = false,
    creatorHandle,
    auth = null,
    uploader = null,
    authGate = null,
    mergeStateSignal = null,
    voxPopApiBaseUrl,
    hostAppBaseUrl,
    onError,
    dotClassName,
    dotLabel,
    dotLayoutId,
    dotVariant = 'ring',
    dotTone = 'accent-warm',
    maxDurationMs,
}: ReplyDotProps) {
    const [phase, setPhase] = useState<ReplyPhase>('idle');
    const [error, setError] = useState<string | null>(null);
    const { containerRef, size: dotSize } = useContainerSize();
    const reducedMotion = useReducedMotion() ?? false;

    // On-domain path needs all three injected adapters. Embed path needs
    // none — the embed POSTs anonymously to /audio/upload-pending and
    // hands off to the host domain via a top-frame redirect.
    const didAuthThisSession = useRef(false);

    // Mirror error state to the consumer when an `onError` sink is provided.
    // Centralizing here (rather than at every `setError` call site) keeps the
    // notification in one place and naturally fires `null` on clear. The
    // consumer renders the message outside the clipped circle.
    //
    // Route `onError` through a ref so the notify effect depends only on
    // `error` — a consumer passing an inline `onError={(m) => ...}` would
    // otherwise change the callback identity every render and re-fire (or
    // loop) the effect on each one.
    const onErrorRef = useRef(onError);
    useEffect(() => {
        onErrorRef.current = onError;
    });
    useEffect(() => {
        onErrorRef.current?.(error);
    }, [error]);

    // `analyser: true` is opt-in because it opens an AudioContext for the
    // duration of the take, which holds the audio hardware awake and counts
    // against the browser's per-page cap. We want one: it is what
    // `HairlineRipple` reads frequency data from, and that reactivity is the
    // dot-mark's signature.
    const { status, recording, errorKind, analyser, start, stop, reset } = useAudioRecorder({
        analyser: true,
        maxDurationMs,
    });

    const isRecording = status === 'recording';
    // The kit owns the take, so these are derived rather than mirrored into
    // local state — one blob, one preview URL, no second copy to keep in step.
    const audioBlob = recording?.blob ?? null;
    const audioUrl = recording?.previewUrl ?? null;

    // Release the kit's preview URL when a new take replaces it or the
    // component goes away. `reset()` revokes the one it is holding, but a
    // second take overwrites `recording` without revoking the first, and
    // unmounting revokes nothing — so this covers the two cases the kit does
    // not. Revoking twice is a no-op, which is what makes the overlap safe.
    //
    // Playback teardown is NOT our problem — the review phase renders a
    // `ListenDot`, which pauses and detaches its own Audio element when it
    // unmounts (which is exactly what leaving the review phase does).
    useEffect(() => {
        return () => {
            if (audioUrl) URL.revokeObjectURL(audioUrl);
        };
    }, [audioUrl]);

    /**
     * Record-complete. The kit is a state machine rather than a callback, so
     * "a take finished" is `status` landing on `recorded`.
     *
     * Gated on `phase === 'recording'` deliberately: `status` STAYS `recorded`
     * after the take (until `reset()`), so an ungated effect would drag the
     * user back to `review` from `sending`, `authenticating` and `success`
     * alike. Only the recording→review edge is a phase change.
     */
    useEffect(() => {
        if (status === 'recorded' && phase === 'recording') setPhase('review');
    }, [status, phase]);

    /**
     * Mic failure. Without this a denied or missing mic stranded the user: the
     * phase flips to `recording` optimistically (see handleTapToRecord) but
     * `start()` rejects, so the dot showed a Stop button for a recording that
     * never began — no message, and no way back to idle but a reload.
     *
     * The message is Vox Pop's, keyed off the kit's `errorKind` discriminant
     * rather than its raw DOMException text. See `recorder-copy.ts`.
     */
    useEffect(() => {
        if (status !== 'error' || !errorKind) return;
        setError(recorderErrorMessage(errorKind));
        setPhase('idle');
    }, [status, errorKind]);

    const needsAuth = useCallback((): boolean => {
        // Embed never auths in the iframe — it uploads anonymously and
        // hands off to the public prompt page, where OTP happens.
        if (isEmbed) return false;
        const user = auth?.user;
        return !user || !user.phoneNumber;
    }, [auth, isEmbed]);

    const handleTapToRecord = () => {
        // Clear any prior permission/device error from a previous attempt.
        // The phase flip is optimistic — if `start()` rejects (denied mic, no
        // device), the kit lands on `status === 'error'` and the effect above
        // reverts us to idle with a fresh message.
        setError(null);
        // `reset()` before `start()` is load-bearing, not tidiness: the kit
        // holds `status === 'recorded'` from any previous take, and the
        // record-complete effect above keys on that. Without clearing it
        // first, flipping to `recording` would immediately satisfy
        // `recorded && phase === 'recording'` and jump straight to review.
        reset();
        // Undo ListenDot's `playback` category, which does not permit capture.
        setAudioSessionType('play-and-record');
        start();
        setPhase('recording');
    };

    const handleStop = () => {
        stop();
    };

    const handleDiscard = () => {
        // Throws away the take and revokes its preview URL — the kit made both,
        // so it is the thing that can release them.
        reset();
        setPhase('idle');
        setError(null);
        // Embed contexts don't have an auth gate; the on-domain path
        // does. Either way, only dismiss if the gate is provided.
        authGate?.dismissAuth();
    };

    // ─── Embed path: anonymous upload + top-frame redirect ──────────────────
    //
    // Record → accept → POST to /audio/upload-pending (anonymous, rate-limited)
    // → top frame navigates to {hostAppBaseUrl}/@handle/promptId?pending=xxx, where
    // OTP + reply submission happen on our origin. No popup, no postMessage,
    // no cross-origin auth state.
    const submitPendingEmbed = useCallback(async () => {
        if (!audioBlob) return;
        if (!creatorHandle) {
            setError('Cannot continue from this embed — missing creator handle.');
            setPhase('review');
            return;
        }
        if (!voxPopApiBaseUrl || !hostAppBaseUrl) {
            // Programming error — embed mode was triggered but the caller
            // forgot to pass the URLs. Surface explicitly rather than
            // letting `fetch(undefined)` crash with a confusing TypeError.
            setError('Embed flow requires voxPopApiBaseUrl + hostAppBaseUrl props.');
            setPhase('review');
            return;
        }

        setPhase('sending');
        setError(null);

        try {
            const formData = new FormData();
            formData.append('file', audioBlob, 'reply.webm');
            formData.append('promptId', promptId);

            const res = await fetch(`${voxPopApiBaseUrl}/api/v1/audio/upload-pending`, {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) {
                // Unwrap the error envelope `{ success: false, error: { message } }`.
                // Reading `body.message` (the old code) always missed — the
                // message is nested under `error` — so every real failure
                // (rate-limit, prompt-not-live, storage) collapsed into the
                // generic "Upload failed". Surface the actual reason, and fall
                // back to the status code so it's never fully opaque.
                // A 404 is the one answer a visitor can act on differently:
                // the prompt is gone (archived or taken down since this page
                // loaded) and no retry will help. The server says "Prompt not
                // found", which reads as a bug to someone who was just looking
                // at the prompt, so say what it means instead.
                if (res.status === 404) throw new Error(PROMPT_CLOSED_MESSAGE);
                const body = await res.json().catch(() => ({} as Record<string, unknown>));
                const serverMessage =
                    (body as { error?: { message?: string }; message?: string })?.error?.message ||
                    (body as { message?: string })?.message;
                throw new Error(serverMessage || `Upload failed (${res.status})`);
            }

            // POST /audio/upload-pending returns `{ success: true, data: { pendingId } }`
            // post envelope-Phase-2. Manual unwrap since this uses raw fetch
            // (anonymous + FormData; can't use authenticatedApi).
            const body = (await res.json()) as { success?: boolean; data?: { pendingId?: string } };
            const pendingId = body?.data?.pendingId;
            if (!pendingId) throw new Error('Upload response missing pendingId');
            // URL-encode every interpolated path segment defensively. Handles
            // are validated to `[a-z0-9_]+` and Firestore doc IDs are URL-safe
            // by convention, so this is belt-and-suspenders — but a future
            // change to either validation set wouldn't silently break the
            // redirect.
            const target = `${hostAppBaseUrl}/@${encodeURIComponent(creatorHandle)}/${encodeURIComponent(promptId)}?pending=${encodeURIComponent(pendingId)}`;

            // Navigate the top frame. In cross-origin iframes we need a user
            // gesture (which we have — the accept tap). `_top` is honoured by
            // every browser we care about; `allow-top-navigation-by-user-activation`
            // covers sandboxed iframes.
            try {
                window.top!.location.href = target;
            } catch {
                window.open(target, '_top');
            }
        } catch (err: unknown) {
            console.error('Error uploading pending reply:', err);
            setError((err as Error).message || 'Failed to send reply.');
            setPhase('review');
        }
    }, [audioBlob, creatorHandle, promptId, voxPopApiBaseUrl, hostAppBaseUrl]);

    // ─── On-site path: existing direct-upload + authenticated reply ─────────
    //
    // A past bug: "authenticated reply on public pages — button just doesn't
    // respond." Root cause:
    // every early-return below pre-fix either silently returned OR awaited
    // `getToken(true)` BEFORE flipping to the `sending` phase, leaving the
    // user staring at the same `review` UI with no feedback for 1–3 seconds
    // (or forever, on the silent paths). This rewrite flips `sending`
    // IMMEDIATELY so the user gets the spinner the instant they tap Send,
    // and converts every silent-return path into a visible error string.
    const submitReply = useCallback(async () => {
        if (!audioBlob) {
            // Audio was somehow cleared between record and submit — rare,
            // but if it happens, surface the state instead of doing
            // nothing. Pre-fix this was a silent `return` and the user
            // saw no response to their tap (Bug 2 root cause #1).
            setError('Recording lost. Please record again.');
            setPhase('review');
            return;
        }
        if (!auth || !uploader || !authGate) {
            // Programming error — on-domain submit was triggered without
            // the required adapters. Embed mode never reaches here
            // (handleAccept short-circuits via submitPendingEmbed).
            setError('On-domain submit requires auth + uploader adapters.');
            setPhase('review');
            return;
        }

        // Flip to `sending` BEFORE the token round-trip so the user sees
        // the spinner immediately, not after 1–3s of perceived dead air.
        // If anything below fails we revert to `review` with the error.
        setPhase('sending');
        setError(null);
        authGate.dismissAuth();

        // Token retrieval — `forceRefresh: false` (the default). The auth
        // adapter refreshes the cached session token before it expires,
        // so for any user on the page less than ~55 minutes the cached
        // token is valid. The 401-retry path in `authenticatedApi` is the
        // only legitimate force-refresh case; paying it on every submit
        // adds 200ms–3s of perceived latency for no benefit. Originally
        // written as `getToken(true)` on the assumption that "a write is
        // worth the round-trip"; review pushed back on that.
        //
        // The `.catch()` is still here because `getToken()` can throw
        // on a transient refresh failure (rare for cached tokens, but
        // possible during refresh-window contention). Converting the
        // throw to `null` keeps the error path in the value position
        // (consistent with the rest of the flow).
        const token = await auth.authenticatedApi.getToken(false).catch((err) => {
            console.error('Token retrieval failed:', err);
            return null;
        });
        if (!token) {
            // "Refresh the page" rather than "sign in again" — `auth.user`
            // is likely still populated in React state, so `needsAuth()`
            // would return false on the next tap and we'd loop right back
            // here. A page refresh forces a re-hydration that re-evaluates
            // sign-in state. Step 5 of the auth-hardening migration will
            // make this surface a proper "sign out then sign in" recovery;
            // for now, the explicit refresh instruction unblocks the user.
            setError('Session expired. Please refresh the page and sign in again.');
            setPhase('review');
            return;
        }

        try {
            const currentUser = auth.authService?.currentUser;
            if (!currentUser) throw new Error('Session lost during submit. Please sign in again.');
            const storagePath = uploader.getReplyStoragePath(promptId, currentUser.uid);
            const result = await uploader.uploadAudio(audioBlob, storagePath);

            if (auth.submitReply) {
                // Stream 4: the app routes this to the Vox Pop BFF (→ Antiphony
                // reply-post). brand-ui stays protocol-agnostic — the app owns
                // the parentPostId + audio-embed shaping, and `audioRef` rides
                // through untouched (we don't know or care that it's a BlobRef).
                await auth.submitReply({
                    promptId,
                    audioUrl: result.url,
                    audioRef: result.audioRef,
                    audioBlob,
                });
            } else {
                await auth.authenticatedApi.postData('/replies', {
                    promptId,
                    audioUrl: result.url,
                    isNew: true,
                });
            }

            setPhase('success');
            authGate.setMergeState({ phase: 'merging', isNewUser: didAuthThisSession.current });
        } catch (err: unknown) {
            console.error('Error sending reply:', err);
            setError((err as Error).message || 'Failed to send reply.');
            setPhase('review');
        }
    }, [audioBlob, auth, uploader, authGate, promptId]);

    // Keep a ref to the latest submitReply so the requestAuth callback
    // always invokes the current version (avoids stale closure).
    const submitReplyRef = useRef(submitReply);
    submitReplyRef.current = submitReply;

    const handleAccept = useCallback(async () => {
        if (!audioBlob) {
            // See submitReply for why this used to be a silent `return`.
            setError('Recording lost. Please record again.');
            setPhase('review');
            return;
        }

        // Embed: hand off to the prompt page via the pending-upload flow.
        if (isEmbed) {
            await submitPendingEmbed();
            return;
        }

        if (needsAuth()) {
            if (!authGate) {
                // Programming error — on-domain mode requires the auth
                // gate. Without it, we can't open the OTP sheet.
                setError('Auth gate is required for the on-domain path.');
                return;
            }
            setPhase('authenticating');
            didAuthThisSession.current = true;
            authGate.requestAuth(
                () => submitReplyRef.current(),
                () => {
                    setPhase('review');
                    authGate.dismissAuth();
                },
            );
            return;
        }

        await submitReply();
    }, [audioBlob, isEmbed, submitPendingEmbed, needsAuth, authGate, submitReply]);

    // When merge is reset (user clicked "Send another"), go back to idle.
    // `mergeStateSignal` is the caller's mirror of `authGate.mergeState` —
    // owned by apps/web's TwoDotsAuthContext.
    // `handleDiscard` is intentionally excluded from the deps — including
    // it (without `useCallback`-stabilizing it) would re-fire this effect
    // on every render. brand-ui's ESLint config doesn't enforce
    // `react-hooks/exhaustive-deps`, so no disable comment is needed.
    useEffect(() => {
        if (mergeStateSignal === null && phase === 'success') {
            handleDiscard();
        }
    }, [mergeStateSignal, phase]);

    // Show blob during recording
    const showBlob = phase === 'recording' && isRecording;

    // Fill the dot once a reply has been captured, mirroring the always-filled
    // listen dot: DotMark's `filled` variant reads as "content lives here", vs
    // `ring` = "awaiting content". `audioBlob` is set on record-complete and
    // cleared on discard/reset, so the dot reverts to its empty ring if the
    // recording is thrown away. Falls back to the caller's `dotVariant` (ring
    // by default) while there's nothing recorded.
    const hasRecordedContent = audioBlob !== null;
    const effectiveDotVariant: DotMarkVariant = hasRecordedContent ? 'filled' : dotVariant;

    // Spoken status for each phase. The visual language here is icon-only
    // controls swapping inside a circle — nothing a screen reader announces on
    // its own — so without this a non-sighted responder can't tell whether
    // recording started, whether their audio was captured, or whether the
    // reply is uploading. `null` = nothing worth saying (idle is self-evident
    // from the labelled record button; success is announced by the caller's
    // confirmation screen, which carries its own role="status").
    const phaseAnnouncement: string | null = (() => {
        switch (phase) {
            case 'recording':
                return 'Recording. Activate the stop button when you are done.';
            case 'review':
                return 'Recording captured. Play it back, discard it, or send your reply.';
            case 'authenticating':
                return 'Recording saved. Verify your phone number to send it.';
            case 'sending':
                return 'Sending your reply.';
            default:
                return null;
        }
    })();

    const isReview = phase === 'review';
    // Distance from the dot's center to the inner edge of each flank button.
    // Derived from the *shrunken* review radius so the buttons hug the smaller
    // circle. `dotSize` is the measured (un-scaled) diameter — the CSS scale
    // transform doesn't change offsetWidth, so we apply REVIEW_DOT_SCALE here.
    const flankOffset = (dotSize * REVIEW_DOT_SCALE) / 2 + REVIEW_FLANK_GAP;

    return (
        // Cluster: the dot is the only in-flow child, so this box sizes to the
        // dot and stays centered in DotPair. The flank buttons are absolutely
        // positioned siblings of the dot, so they escape the dot's
        // `overflow-hidden` clip and overflow the cluster symmetrically.
        <div className="relative flex items-center justify-center">
            {/* Phase announcements. Visually hidden, polite so it never
                interrupts — the visible UI is icon-only and silent otherwise. */}
            <p className="sr-only" role="status" aria-live="polite">
                {phaseAnnouncement ?? ''}
            </p>

            {/* Dot wrapper — scales the whole circle down in review. Kept as a
                separate element from DotMark so its transform never collides
                with DotMark's `layout` animation (the merge handoff). */}
            <m.div
                className="relative"
                animate={{ scale: isReview ? REVIEW_DOT_SCALE : 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
                <DotMark
                    variant={effectiveDotVariant}
                    tone={dotTone}
                    className={dotClassName}
                    label={dotLabel}
                    layoutId={dotLayoutId}
                >
                    <div
                        ref={containerRef}
                        className="relative flex items-center justify-center w-full h-full"
                    >
                        {/* Sweep first: it's the level-independent "still
                            rolling" cue, and must paint under the ripple and
                            the centered control. */}
                        <CaptureSweep active={showBlob} tone={dotTone} reducedMotion={reducedMotion} />

                        {/* HairlineRipple — renders behind content, extends beyond dot */}
                        {showBlob && dotSize > 0 && (
                            <HairlineRipple
                                analyser={analyser}
                                dotSize={dotSize}
                                reach={28}
                                active
                                reducedMotion={reducedMotion}
                            />
                        )}

                        <AnimatePresence mode="wait">
                            {/* IDLE — Mic button.
                                Bug 4 sized the primary actions so the central
                                control doesn't jump as the phase changes; the
                                numbers now live in `dot-metrics` alongside
                                ListenDot's, which drifted from these. */}
                            {phase === 'idle' && (
                                <m.div
                                    key="idle"
                                    className="flex flex-col items-center gap-3"
                                    {...phaseTransition}
                                >
                                    <m.button
                                        onClick={handleTapToRecord}
                                        className="rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg"
                                        style={{
                                            width: DOT_PRIMARY_CONTROL,
                                            height: DOT_PRIMARY_CONTROL,
                                        }}
                                        {...buttonScalePrimary}
                                        aria-label="Start recording your reply"
                                    >
                                        <m.span {...micBreathing}>
                                            <Mic size={DOT_PRIMARY_ICON} />
                                        </m.span>
                                    </m.button>
                                    {/* Permission / device errors land here after a
                                        failed start. Suppressed when an `onError`
                                        sink is provided — the consumer renders the
                                        message outside the clipped circle instead. */}
                                    {!onError && error && (
                                        <p
                                            role="alert"
                                            className="text-xs text-destructive text-center max-w-[200px]"
                                        >
                                            {error}
                                        </p>
                                    )}
                                </m.div>
                            )}

                            {/* RECORDING — Stop button only (blob handles visualization) */}
                            {phase === 'recording' && (
                                <m.button
                                    key="recording"
                                    onClick={handleStop}
                                    className="rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg"
                                    style={{
                                        width: DOT_PRIMARY_CONTROL,
                                        height: DOT_PRIMARY_CONTROL,
                                    }}
                                    {...phaseTransition}
                                    {...buttonScaleSecondary}
                                    aria-label="Stop recording"
                                >
                                    <Square size={DOT_STOP_ICON} className="fill-current" />
                                </m.button>
                            )}

                            {/* REVIEW — the dot holds ONLY the play-preview control;
                                discard + send render as flanks outside the dot
                                (below). No in-dot caption, so the control stays
                                optically centered.

                                The preview IS a `ListenDot` — same glyph, same
                                progress sweep, same play()-rejection handling
                                as the creator's side of the conversation. It
                                used to be a second hand-rolled
                                play/pause-a-blob-in-a-circle whose only error
                                path was `console.error`, which left the button
                                dead and silent when playback failed.

                                No `peaks` to pass (the recorder hands back a
                                blob, not an analysis), so the ripple stays off
                                here and the sweep carries progress alone. */}
                            {phase === 'review' && audioUrl && (
                                <m.div
                                    key="review"
                                    className="absolute inset-0"
                                    {...phaseTransition}
                                >
                                    <ListenDot
                                        audioUrl={audioUrl}
                                        subject="your recording"
                                        // Route playback failures into our own
                                        // error state so they surface wherever
                                        // the consumer renders our messages —
                                        // outside the clipped circle.
                                        onError={setError}
                                    />
                                </m.div>
                            )}

                            {/* AUTHENTICATING — Compact indicator */}
                            {phase === 'authenticating' && (
                                <m.div
                                    key="authenticating"
                                    className="flex flex-col items-center gap-2"
                                    {...phaseTransition}
                                >
                                    <div className="w-12 h-12 rounded-full border-2 border-primary/30 flex items-center justify-center">
                                        <Mic className="h-5 w-5 text-primary/60" />
                                    </div>
                                    <span className="text-xs text-muted-foreground">Recording saved</span>
                                </m.div>
                            )}

                            {/* SENDING — Spinner */}
                            {phase === 'sending' && (
                                <m.div
                                    key="sending"
                                    className="flex items-center justify-center"
                                    {...phaseTransition}
                                >
                                    <Loader2 className="h-10 w-10 text-primary animate-spin" />
                                </m.div>
                            )}

                            {/* SUCCESS — Empty placeholder (PublicPrompt shows merged dot animation) */}
                            {phase === 'success' && (
                                <m.div
                                    key="success"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 0 }}
                                />
                            )}
                        </AnimatePresence>
                    </div>
                </DotMark>
            </m.div>

            {/* REVIEW flanks — discard (back, left) and send (forward, right),
                positioned just outside the shrunken dot. Each is a direct keyed
                child of AnimatePresence (not wrapped in a Fragment, which would
                hide them from exit tracking). Opacity-only animation so the
                inline positioning transform isn't clobbered by Framer. */}
            <AnimatePresence>
                {/* Discard (X) — left = "go back" */}
                {isReview && dotSize > 0 && (
                    <m.button
                        key="discard-flank"
                        onClick={handleDiscard}
                        className="absolute z-10 w-12 h-12 rounded-full border-2 border-border bg-card flex items-center justify-center shadow-sm"
                        // Dynamic offset lives in `left` (not `transform`) so a
                        // future transform-based animation (e.g. a hover scale)
                        // can't clobber the positioning. `transform` stays purely
                        // for centering: -100% anchors the button's right edge.
                        style={{
                            top: '50%',
                            left: `calc(50% - ${flankOffset}px)`,
                            transform: 'translate(-100%, -50%)',
                        }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        aria-label="Discard recording"
                    >
                        <X className="h-5 w-5 text-muted-foreground" />
                    </m.button>
                )}

                {/* Send (→) — right = "go forward". Primary action. */}
                {isReview && dotSize > 0 && (
                    <m.button
                        key="send-flank"
                        onClick={handleAccept}
                        className="absolute z-10 w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg"
                        // Dynamic offset in `left` (see discard button); transform
                        // stays purely for vertical centering.
                        style={{
                            top: '50%',
                            left: `calc(50% + ${flankOffset}px)`,
                            transform: 'translate(0, -50%)',
                        }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        aria-label={`Send reply to ${hostName}`}
                    >
                        <Send className="h-6 w-6" />
                    </m.button>
                )}
            </AnimatePresence>
        </div>
    );
}
