'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { m, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Play, Pause } from 'lucide-react';
import { HairlineRipple } from './HairlineRipple';
import { useContainerSize } from '../hooks/use-container-size';
import { buttonScalePrimary, iconSwap } from '../motion';
import { playbackIconSize, playGlyphOffset } from '../dot-metrics';
import { setAudioSessionType } from '../utils/audio-session';

/**
 * Lockscreen / hardware-media-key metadata. Optional — pass it (e.g. from the
 * dashboard reply detail) to claim the browser's MediaSession on play. Public
 * pages omit it and ListenDot touches MediaSession not at all.
 */
export interface ListenDotMediaSession {
  title: string;
  artist?: string;
  album?: string;
  artwork?: MediaImage[];
}

interface ListenDotProps {
  audioUrl: string;
  peaks?: number[];
  mediaSession?: ListenDotMediaSession;
  /**
   * What the audio *is*, in the accessible name — "Play {subject}".
   *
   * The dot is an icon-only control, so this string is the entire label a
   * screen reader gets. ReplyDot's review phase passes "your recording" so the
   * preview doesn't announce itself as the creator's prompt.
   */
  subject?: string;
  /**
   * Optional sink for playback failures. When provided, the consumer owns the
   * message and the in-dot notice is suppressed.
   *
   * This exists because the notice is rendered BELOW the dot and every real
   * consumer mounts ListenDot inside `DotMark`, which is `overflow-hidden` —
   * so the in-dot fallback is clipped everywhere it currently ships. Mirrors
   * `ReplyDot`'s `onError` prop, including firing `null` on clear.
   */
  onError?: (message: string | null) => void;
  /**
   * Playback progress sink — `(progress 0–1, isPlaying)` on every animation
   * frame while playing, and once on pause/end. Lets a consumer keep something
   * outside the circle in step with the audio (the marketing hero reveals a
   * transcript against it) without owning a second `<audio>`.
   */
  onProgress?: (progress: number, isPlaying: boolean) => void;
  /** Fires when the clip plays to the end. */
  onEnded?: () => void;
  /**
   * Start playing as soon as the element is ready. Only honoured when the
   * consumer has already had a user gesture (autoplay policy) — e.g. a
   * playlist advancing to the next clip after the previous one ended.
   */
  autoPlay?: boolean;
}

// Module-scope owner: identity of the ListenDot currently driving the browser's
// MediaSession. Each instance compares its own token to decide whether to keep
// mirroring playback state (only one owner at a time).
let currentMediaSessionOwner: object | null = null;

const MEDIA_SESSION_ACTIONS: MediaSessionAction[] = ['play', 'pause', 'seekto'];

/**
 * Describe a rejected `HTMLMediaElement.play()` in terms a listener can act on,
 * or `null` when the rejection is benign and should stay invisible.
 *
 * The `DOMException` *name* is the only portable signal here — the messages
 * differ per browser. `AbortError` means a newer load or pause superseded this
 * play call, which is normal churn, not a failure.
 *
 * Read `name` structurally rather than via `instanceof Error`: `DOMException`
 * inherits from `Error` in browsers but NOT in every environment (jsdom's
 * doesn't), and an `instanceof` miss silently downgraded every classified
 * rejection to the generic message — including the benign `AbortError`, which
 * would then accuse the listener of a failure that didn't happen.
 */
function describePlaybackError(err: unknown): string | null {
  const name =
    typeof err === 'object' && err !== null && typeof (err as { name?: unknown }).name === 'string'
      ? (err as { name: string }).name
      : '';
  if (name === 'AbortError') return null;
  if (name === 'NotAllowedError') return 'Your browser blocked playback — tap play again.';
  if (name === 'NotSupportedError') return "This audio can't be played in this browser.";
  return "Couldn't play that audio. Tap to try again.";
}

function clearGlobalMediaSession() {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
  navigator.mediaSession.playbackState = 'none';
  navigator.mediaSession.metadata = null;
  for (const action of MEDIA_SESSION_ACTIONS) {
    try {
      navigator.mediaSession.setActionHandler(action, null);
    } catch {
      /* unsupported action — ignore */
    }
  }
}

/**
 * ListenDot — Audio playback UI designed for the circular dot container.
 *
 * The listen dot should feel "full" — content exists here. Uses:
 * - HairlineRipple extending beyond the dot edge (from pre-computed peaks)
 * - A progress sweep that illuminates as audio plays
 * - A centered play/pause icon
 *
 * The ripple visualization replaces the old horizontal waveform bars,
 * creating concentric hairline rings that emanate from the circle.
 */
export function ListenDot({
  audioUrl,
  peaks,
  mediaSession,
  subject = 'prompt audio',
  onError,
  onProgress,
  onEnded,
  autoPlay = false,
}: ListenDotProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animFrameRef = useRef<number>(0);
  const { containerRef, size: dotSize } = useContainerSize();
  const reducedMotion = useReducedMotion() ?? false;

  // Stable identity for MediaSession ownership; latest metadata kept in a ref
  // so the long-lived `ended` handler always reads the current prop.
  const mediaSessionTokenRef = useRef<object>({});
  const mediaSessionRef = useRef(mediaSession);
  mediaSessionRef.current = mediaSession;

  // Mirror playback failures to the consumer's sink when one is provided.
  // Routed through a ref so the notify effect depends only on the message — an
  // inline `onError={(m) => …}` would otherwise change identity every render
  // and re-fire the effect on each one (same reasoning as ReplyDot's copy).
  const onErrorRef = useRef(onError);
  const onProgressRef = useRef(onProgress);
  const onEndedRef = useRef(onEnded);
  useEffect(() => {
    onErrorRef.current = onError;
    onProgressRef.current = onProgress;
    onEndedRef.current = onEnded;
  });

  useEffect(() => {
    const audio = new Audio(audioUrl);
    audio.preload = 'metadata';
    audioRef.current = audio;
    // A new source deserves a fresh attempt — don't carry the old clip's error.
    setPlaybackError(null);

    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      setProgress(0);
      onProgressRef.current?.(1, false);
      if (currentMediaSessionOwner === mediaSessionTokenRef.current && 'mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'none';
      }
      onEndedRef.current?.();
    });

    // Autoplay: the caller vouches that a gesture already happened (a playlist
    // advancing). A rejection here is the same benign/blocked split as the
    // button path, so it goes through the same classifier.
    if (autoPlay) {
      setAudioSessionType('playback');
      audio.play().then(
        () => setIsPlaying(true),
        (err: unknown) => {
          const message = describePlaybackError(err);
          if (message) setPlaybackError(message);
        },
      );
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      audio.pause();
      audio.src = '';
    };
    // `autoPlay` is deliberately not a dependency: it is read once per source,
    // and flipping it mid-clip must not restart the audio.
  }, [audioUrl]);

  useEffect(() => {
    onErrorRef.current?.(playbackError);
  }, [playbackError]);

  // Relinquish MediaSession ownership on unmount so a stale lockscreen card
  // doesn't outlive the dot.
  useEffect(() => {
    const token = mediaSessionTokenRef.current;
    return () => {
      if (currentMediaSessionOwner === token) {
        clearGlobalMediaSession();
        currentMediaSessionOwner = null;
      }
    };
  }, []);

  const updateProgress = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.duration) {
      const p = audio.currentTime / audio.duration;
      setProgress(p);
      onProgressRef.current?.(p, true);
      // Feed the lockscreen scrubber while we own MediaSession.
      if (
        currentMediaSessionOwner === mediaSessionTokenRef.current &&
        'mediaSession' in navigator &&
        navigator.mediaSession.setPositionState
      ) {
        try {
          navigator.mediaSession.setPositionState({
            duration: audio.duration,
            position: audio.currentTime,
            playbackRate: audio.playbackRate,
          });
        } catch {
          /* setPositionState throws on invalid duration/position — ignore */
        }
      }
    }
    if (isPlaying) {
      animFrameRef.current = requestAnimationFrame(updateProgress);
    }
  }, [isPlaying]);

  useEffect(() => {
    if (isPlaying) {
      animFrameRef.current = requestAnimationFrame(updateProgress);
    } else if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, updateProgress]);

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      onProgressRef.current?.(audio.duration ? audio.currentTime / audio.duration : 0, false);
      if (currentMediaSessionOwner === mediaSessionTokenRef.current && 'mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
    } else {
      // `play()` rejects for autoplay policy, a failed fetch, or a decode
      // error. Unhandled, that surfaced as a dead button plus a console-only
      // rejection; the caller gets a retryable error state instead.
      // Before play(), not after: on iOS a page that has used the mic is left
      // in a category that obeys the ringer switch. See audio-session.ts.
      setAudioSessionType('playback');
      try {
        await audio.play();
      } catch (err) {
        setIsPlaying(false);
        // `null` means the rejection was benign (a superseded play) — leave the
        // dot idle without accusing the listener of a failure that isn't one.
        const message = describePlaybackError(err);
        if (message) setPlaybackError(message);
        return;
      }
      setPlaybackError(null);
      setIsPlaying(true);

      // Claim the browser's MediaSession (lockscreen / media keys) when the
      // caller supplied metadata. Previous owners stop mirroring once their
      // token no longer matches.
      const meta = mediaSessionRef.current;
      if (meta && 'mediaSession' in navigator) {
        currentMediaSessionOwner = mediaSessionTokenRef.current;
        try {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: meta.title,
            artist: meta.artist ?? '',
            album: meta.album ?? '',
            artwork: meta.artwork ?? [],
          });
        } catch {
          /* MediaMetadata can throw on invalid artwork URLs — ignore */
        }
        // Handlers read `audioRef.current` rather than closing over the local
        // `audio` — if `audioUrl` changes, a new Audio replaces the ref and the
        // lockscreen/media keys must drive the live instance, not the old one.
        navigator.mediaSession.setActionHandler('play', () => {
          const current = audioRef.current;
          if (!current) return;
          setAudioSessionType('playback');
          // Same rejection risk as the button path; resolve before claiming
          // "playing", or the lockscreen lies about a stalled track.
          current.play().then(
            () => {
              setIsPlaying(true);
              navigator.mediaSession.playbackState = 'playing';
            },
            (err: unknown) => {
              setIsPlaying(false);
              navigator.mediaSession.playbackState = 'paused';
              const message = describePlaybackError(err);
              if (message) setPlaybackError(message);
            },
          );
        });
        navigator.mediaSession.setActionHandler('pause', () => {
          const current = audioRef.current;
          if (!current) return;
          current.pause();
          setIsPlaying(false);
          navigator.mediaSession.playbackState = 'paused';
        });
        try {
          navigator.mediaSession.setActionHandler('seekto', (d) => {
            const current = audioRef.current;
            if (current && typeof d.seekTime === 'number') current.currentTime = d.seekTime;
          });
        } catch {
          /* 'seekto' unsupported on some platforms — ignore */
        }
        navigator.mediaSession.playbackState = 'playing';
      }
    }
  };

  const hasPeaks = peaks && peaks.length > 0;
  // Glyph scales with the measured dot so this component can render in a
  // preview-sized circle (ReplyDot's review phase) without overflowing it.
  const iconSize = playbackIconSize(dotSize);

  return (
    <div ref={containerRef} className="relative flex items-center justify-center w-full h-full">
      {/* HairlineRipple — only shown during active playback */}
      {hasPeaks && dotSize > 0 && isPlaying && (
        <HairlineRipple
          peaks={peaks}
          progress={progress}
          dotSize={dotSize}
          reach={20}
          active
          reducedMotion={reducedMotion}
        />
      )}

      {/* Progress fill — sweeps clockwise as a conic gradient (inside the dot) */}
      <div
        className="absolute inset-2 rounded-full transition-all duration-100 pointer-events-none"
        style={{
          background: progress > 0
            ? `conic-gradient(hsl(var(--primary) / 0.10) ${progress * 360}deg, transparent ${progress * 360}deg)`
            : undefined,
        }}
      />


      {/* Play/Pause button — centered */}
      <button
        onClick={() => void togglePlayback()}
        className="relative z-10 flex items-center justify-center cursor-pointer group"
        aria-label={
          isPlaying
            ? `Pause ${subject}`
            : playbackError
              ? `Retry playing ${subject}`
              : `Play ${subject}`
        }
      >
        <m.div {...buttonScalePrimary}>
          <AnimatePresence mode="wait">
            {isPlaying ? (
              <m.div key="pause" {...iconSwap}>
                {/* Size comes from `dot-metrics` rather than a Tailwind tier —
                    the glyph is the entire touch target here, so it tracks the
                    dot's measured diameter (Bug 4 raised it to 64px against the
                    cap-18rem desktop dot; that's now the ceiling, not a
                    constant). */}
                <Pause
                  size={iconSize}
                  className="text-primary fill-primary drop-shadow-md"
                />
              </m.div>
            ) : (
              <m.div key="play" {...iconSwap}>
                {/* Lucide's Play triangle has its visual centroid offset right
                    of its bounding-box center by roughly icon/6, so the optical
                    correction has to scale with the glyph — `ml-2` was a
                    64px-only approximation and drifted at any other size. */}
                <Play
                  size={iconSize}
                  style={{ marginLeft: playGlyphOffset(iconSize) }}
                  className="drop-shadow-md text-primary fill-primary"
                />
              </m.div>
            )}
          </AnimatePresence>
        </m.div>
      </button>

      {/* Failure notice — sits below the dot so it never covers the control
          the listener needs to press to retry. `role="status"` announces it
          without stealing focus.

          Suppressed when the consumer passes `onError`: this element is
          positioned outside the dot's box, and `DotMark` (which every real
          consumer wraps around us) clips it. A consumer with a sink renders
          the same message where it can actually be seen. */}
      {!onError && playbackError && (
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
