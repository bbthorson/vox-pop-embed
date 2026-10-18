'use client';

import React, { useState, useEffect, useRef } from 'react';
import { m, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Mic, Square, Play, Pause, Send, ArrowRight, X } from 'lucide-react';
import { useAudioRecorder } from '@antiphony/capture-kit';
import { setAudioSessionType } from '../utils/audio-session';
import { recorderErrorMessage } from '../recorder-copy';
import { useContainerSize } from '../hooks/use-container-size';
import { HairlineRipple } from './HairlineRipple';
import { CaptureSweep } from './CaptureSweep';
import { DotMark, type DotMarkVariant, type DotMarkTone } from './DotMark';
import {
    phaseTransition,
    micBreathing,
    buttonScalePrimary,
    buttonScaleSecondary,
} from '../motion';

export type RecordPhase = 'idle' | 'recording' | 'review';

/**
 * How much the dot shrinks in `review` to make room for the flank buttons that
 * sit just outside it, and the gap between the shrunken dot's edge and each
 * flank. Kept identical to ReplyDot so the two recorders read the same.
 */
const REVIEW_DOT_SCALE = 0.72;
const REVIEW_FLANK_GAP = 12;

interface RecordingContentProps {
    /** Called with the recorded blob when recording completes */
    onRecordingComplete: (blob: Blob) => void;
    /** Called when the user discards the recording */
    onDiscard: () => void;
    /** Whether a recording already exists (shows review state) */
    hasRecording: boolean;
    /** Audio blob for playback preview */
    audioBlob?: Blob | null;
    /** Called when recording starts/stops */
    onRecordingStatusChange?: (isRecording: boolean) => void;
    /** Called with permission error message */
    onPermissionError?: (error: string) => void;
    /** Called when the phase changes */
    onPhaseChange?: (phase: RecordPhase) => void;
    /** Called with elapsed recording seconds */
    onRecordingSecondsChange?: (seconds: number) => void;
    /**
     * When provided, adds a primary Accept/Send flank in `review` (right side,
     * mirroring ReplyDot's send). The caller already holds the blob (from
     * onRecordingComplete), so the callback takes no arguments. Without it,
     * `review` shows only the discard flank — used when the accept action lives
     * elsewhere (e.g. a form Publish button).
     */
    onAccept?: () => void;
    /** Aria-label for the accept button. */
    acceptLabel?: string;
    /**
     * Glyph on the accept button. `send` reads as the final step; use `continue`
     * when accepting only advances to a further step (e.g. a publish form), so
     * the button doesn't promise more than it does.
     */
    acceptIcon?: 'send' | 'continue';
    /** Size/shape class for the dot (e.g. `w-full h-full`). */
    dotClassName?: string;
    /** Dot color tone. Defaults to the canonical coral. */
    dotTone?: DotMarkTone;
    /**
     * Hard stop for a take, in milliseconds. The kit auto-stops at the limit
     * rather than refusing to continue, so the speaker keeps what they said.
     *
     * **Required, and deliberately not defaulted.** This kit is presentation —
     * it has no idea whether it is capturing a 90-second prompt or a five-minute
     * reply, and a default here would be a fourth answer to a question
     * `@vox-pop/shared/types/audio-limits` exists to answer once. Callers pass
     * `PROMPT_MAX_DURATION_MS` or `REPLY_MAX_DURATION_MS` from there.
     */
    maxDurationMs: number;
}

/**
 * RecordingContent — the prompt-author recorder, structurally identical to
 * `ReplyDot`'s recorder so the two stay visually consistent.
 *
 * It **owns its own `DotMark`** (consumers pass `dotClassName`/`dotTone` rather
 * than wrapping it). That ownership is the whole point: the `review`-phase
 * action buttons (discard / accept) render as absolutely-positioned flanks
 * OUTSIDE the dot's `overflow-hidden` circle, so we never get the cramped
 * "three buttons inside the dot" layout. The dot is a `ring` while empty and
 * fills to `filled` once a recording exists — matching ReplyDot.
 */
export function RecordingContent({
    onRecordingComplete,
    onDiscard,
    hasRecording,
    audioBlob,
    onRecordingStatusChange,
    onPermissionError,
    onPhaseChange,
    onRecordingSecondsChange,
    onAccept,
    acceptLabel = 'Accept recording',
    acceptIcon = 'send',
    dotClassName,
    dotTone = 'primary',
    maxDurationMs,
}: RecordingContentProps) {
    const [phase, setPhase] = useState<RecordPhase>(hasRecording ? 'review' : 'idle');
    const [isPlayingBack, setIsPlayingBack] = useState(false);
    const audioPlaybackRef = useRef<HTMLAudioElement | null>(null);
    const audioUrlRef = useRef<string | null>(null);
    const { containerRef, size: dotSize } = useContainerSize();
    const reducedMotion = useReducedMotion() ?? false;


    // Emit the initial phase once on mount so a restored draft (hasRecording=true)
    // seeds the parent's recordPhase without waiting for the next phase change.
    useEffect(() => {
        onPhaseChange?.(phase);
        // Mount-only: deps intentionally empty. brand-ui's ESLint config doesn't
        // enforce react-hooks/exhaustive-deps, so we use a prose note rather than
        // a disable directive (a directive for an unregistered rule errors under
        // flat config). Same convention as ReplyDot.
    }, []);

    useEffect(() => {
        if (hasRecording && phase === 'idle') updatePhase('review');
        if (!hasRecording && phase === 'review') updatePhase('idle');
        // Intentionally keyed on `hasRecording` only — see the mount note above.
    }, [hasRecording]);

    function updatePhase(next: RecordPhase) {
        setPhase(next);
        onPhaseChange?.(next);
    }

    // `analyser: true` opens an AudioContext for the take (opt-in in the kit
    // because it holds the audio hardware awake). `HairlineRipple` reads
    // frequency data off it — that is the dot's audio reactivity.
    const { status, recording, elapsedMs, errorKind, analyser, start, stop, reset } =
        useAudioRecorder({ analyser: true, maxDurationMs });

    const isRecording = status === 'recording';

    /**
     * Record-complete. Gated on the phase for the same reason ReplyDot's is:
     * `status` stays `recorded` until `reset()`, so an ungated effect would
     * re-announce the take (and re-enter `review`) on every later render.
     */
    useEffect(() => {
        if (status !== 'recorded' || phase !== 'recording' || !recording) return;
        onRecordingComplete(recording.blob);
        updatePhase('review');
        // `onRecordingComplete` and `updatePhase` are excluded deliberately —
        // both are recreated every render by the caller, and including them
        // would re-fire this on each one. Keyed on the state transition, which
        // is the actual event. Same convention as the mount note above.
    }, [status, phase, recording]);

    useEffect(() => {
        if (status !== 'error' || !errorKind) return;
        onPermissionError?.(recorderErrorMessage(errorKind));
    }, [status, errorKind, onPermissionError]);

    /**
     * The elapsed counter is the kit's now. It ticks one interval for both the
     * counter and its own `maxDurationMs` enforcement, which is strictly better
     * than the parallel `setInterval` this used to run against the same clock —
     * two timers reading one start time is how a cap and a counter disagree.
     */
    useEffect(() => {
        onRecordingSecondsChange?.(isRecording ? Math.floor(elapsedMs / 1000) : 0);
    }, [isRecording, elapsedMs, onRecordingSecondsChange]);

    useEffect(() => {
        onRecordingStatusChange?.(isRecording);
    }, [isRecording, onRecordingStatusChange]);

    useEffect(() => {
        return () => {
            if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
            if (audioPlaybackRef.current) {
                audioPlaybackRef.current.pause();
                audioPlaybackRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
        if (audioBlob) {
            audioUrlRef.current = URL.createObjectURL(audioBlob);
        } else {
            audioUrlRef.current = null;
        }
        if (audioPlaybackRef.current) {
            audioPlaybackRef.current.pause();
            audioPlaybackRef.current = null;
        }
        setIsPlayingBack(false);
    }, [audioBlob]);

    const handleTapToRecord = () => {
        // `reset()` first so a previous take's `recorded` status cannot satisfy
        // the record-complete effect the instant the phase flips — see
        // ReplyDot's handleTapToRecord for the same note.
        reset();
        // Undo ListenDot's `playback` category, which does not permit capture.
        setAudioSessionType('play-and-record');
        start();
        updatePhase('recording');
    };

    const handleStop = () => {
        stop();
    };

    const handleDiscard = () => {
        setIsPlayingBack(false);
        if (audioPlaybackRef.current) {
            audioPlaybackRef.current.pause();
            audioPlaybackRef.current = null;
        }
        updatePhase('idle');
        onDiscard();
    };

    const handlePlayback = () => {
        if (!audioUrlRef.current) return;

        if (isPlayingBack && audioPlaybackRef.current) {
            audioPlaybackRef.current.pause();
            setIsPlayingBack(false);
            return;
        }

        if (!audioPlaybackRef.current) {
            audioPlaybackRef.current = new Audio(audioUrlRef.current);
            audioPlaybackRef.current.onended = () => setIsPlayingBack(false);
        }

        setAudioSessionType('playback');
        audioPlaybackRef.current.play().catch(console.error);
        setIsPlayingBack(true);
    };

    const showBlob = phase === 'recording' && isRecording;
    const isReview = phase === 'review';
    // Fill the dot once something is recorded; ring while empty (ReplyDot parity).
    // Keyed on `isReview` too, not just the `audioBlob` prop: phase flips to
    // 'review' synchronously on record-complete while the blob propagates from
    // the parent on the next render, so reading the prop alone flickers 'ring'
    // for one frame.
    const effectiveDotVariant: DotMarkVariant = audioBlob || isReview ? 'filled' : 'ring';
    // Flank distance from center: half the *shrunken* dot radius + gap. dotSize
    // is the un-scaled measured diameter, so apply the scale here.
    const flankOffset = (dotSize * REVIEW_DOT_SCALE) / 2 + REVIEW_FLANK_GAP;

    return (
        // Cluster: the dot is the only in-flow child, so the box sizes to the dot.
        // Flank buttons are absolutely-positioned siblings, escaping the dot's
        // `overflow-hidden` clip.
        <div className="relative flex items-center justify-center">
            <m.div
                className="relative"
                animate={{ scale: isReview ? REVIEW_DOT_SCALE : 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
                <DotMark variant={effectiveDotVariant} tone={dotTone} className={dotClassName}>
                    <div
                        ref={containerRef}
                        className="relative flex items-center justify-center w-full h-full"
                    >
                        {/* Sweep first: it's the level-independent "still
                            rolling" cue, and must paint under the ripple and
                            the centered control. */}
                        <CaptureSweep active={showBlob} tone={dotTone} reducedMotion={reducedMotion} />

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
                            {phase === 'idle' && (
                                <m.button
                                    key="idle"
                                    type="button"
                                    onClick={handleTapToRecord}
                                    className="w-20 h-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg"
                                    {...phaseTransition}
                                    {...buttonScalePrimary}
                                    aria-label="Start recording"
                                    data-testid="record-audio-button"
                                >
                                    <m.span {...micBreathing}>
                                        <Mic className="h-9 w-9" />
                                    </m.span>
                                </m.button>
                            )}

                            {phase === 'recording' && (
                                <m.button
                                    key="recording"
                                    type="button"
                                    onClick={handleStop}
                                    className="w-20 h-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg"
                                    {...phaseTransition}
                                    {...buttonScaleSecondary}
                                    aria-label="Stop recording"
                                >
                                    <Square className="h-7 w-7 fill-current" />
                                </m.button>
                            )}

                            {/* REVIEW — the dot holds ONLY the play-preview control;
                                discard + accept render as flanks outside (below). */}
                            {phase === 'review' && (
                                <m.button
                                    key="review"
                                    type="button"
                                    onClick={handlePlayback}
                                    className="w-16 h-16 rounded-full border-2 border-border bg-card flex items-center justify-center shadow-sm"
                                    {...phaseTransition}
                                    {...buttonScaleSecondary}
                                    aria-label={isPlayingBack ? 'Pause preview' : 'Play preview'}
                                >
                                    {isPlayingBack ? (
                                        <Pause className="h-7 w-7 text-primary" />
                                    ) : (
                                        <Play className="h-7 w-7 text-primary ml-0.5" />
                                    )}
                                </m.button>
                            )}
                        </AnimatePresence>
                    </div>
                </DotMark>
            </m.div>

            {/* REVIEW flanks — discard (X, left) and accept (→, right), positioned
                just outside the shrunken dot so they escape its overflow-hidden
                clip. Opacity-only animation so the inline positioning transform
                isn't clobbered by Framer. */}
            <AnimatePresence>
                {isReview && dotSize > 0 && (
                    <m.button
                        key="discard-flank"
                        type="button"
                        onClick={handleDiscard}
                        className="absolute z-10 w-12 h-12 rounded-full border-2 border-border bg-card flex items-center justify-center shadow-sm"
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

                {isReview && dotSize > 0 && onAccept && (
                    <m.button
                        key="accept-flank"
                        type="button"
                        onClick={onAccept}
                        className="absolute z-10 w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg"
                        style={{
                            top: '50%',
                            left: `calc(50% + ${flankOffset}px)`,
                            transform: 'translate(0, -50%)',
                        }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        aria-label={acceptLabel}
                    >
                        {acceptIcon === 'continue' ? <ArrowRight className="h-6 w-6" /> : <Send className="h-6 w-6" />}
                    </m.button>
                )}
            </AnimatePresence>
        </div>
    );
}
