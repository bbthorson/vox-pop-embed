'use client';

import React, { useEffect, useRef } from 'react';

/**
 * Fallback when `getComputedStyle(document.documentElement)` can't resolve
 * `--primary` (a canvas painted before the cascade settles, or an embed render
 * where design-tokens CSS hasn't loaded). Hex matches the brand `primary`;
 * keep aligned if the brand color shifts.
 */
// This IS the getComputedStyle fallback; resolving the variable is the very
// thing it stands in for, so it cannot itself read a token.
// eslint-disable-next-line vox-pop/no-hardcoded-colors
const FALLBACK_PRIMARY = '#d13610';

// Animation tuning constants
const RING_LIFE_MS = 1900; // travel + fade duration of one ring
const HEARTBEAT_LUB_MS = 170; // short gap (the "lub-dub")
const HEARTBEAT_PAUSE_MS = 1150; // long resting gap
const FAST_INTERVAL_MS = 95; // floor on spawn interval at full amplitude
const STROKE_MAX_ALPHA = 0.5;
const STATIC_RINGS = 4; // reduced-motion resting frame

interface HairlineRippleProps {
    /** Live frequency data source (recording mode). */
    analyser?: AnalyserNode | null;
    /** Pre-computed peaks for static/playback display (0–1 normalized). */
    peaks?: number[];
    /** Current playback progress 0–1 (drives amplitude in the peaks path). */
    progress?: number;
    /** Diameter of the parent dot circle in pixels. */
    dotSize: number;
    /** How far the ripples extend beyond the dot edge (px). */
    reach?: number;
    /** Whether the visualization is actively animating (recording/playback). */
    active?: boolean;
    /** Optional color override (resolved CSS color string). */
    color?: string;
    /**
     * When true, render a static resting frame and start NO requestAnimationFrame
     * loop — honors `prefers-reduced-motion`. Source from `useReducedMotion()`.
     */
    reducedMotion?: boolean;
}

/** Build an `hsl()`/`rgba()` string with the given alpha (0–1). */
function withAlpha(resolved: string, alpha: number): string {
    if (alpha <= 0) return 'transparent';
    if (resolved.startsWith('hsl(')) {
        const inner = resolved.slice(4, -1); // strip `hsl(` and `)`
        return `hsl(${inner} / ${alpha})`;
    }
    if (resolved.startsWith('rgb(')) {
        const inner = resolved.slice(4, -1); // strip `rgb(` and `)`
        return `rgba(${inner}, ${alpha})`;
    }
    if (resolved.startsWith('#')) {
        const hex = resolved.slice(1);
        // Expand shorthand (#f00) to full form before parsing channels.
        const fullHex =
            hex.length === 3 ? hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2] : hex;
        const r = parseInt(fullHex.slice(0, 2), 16);
        const g = parseInt(fullHex.slice(2, 4), 16);
        const b = parseInt(fullHex.slice(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return resolved;
}

interface Ring {
    age: number; // ms
    strength: number; // 0–1 initial intensity
}

/**
 * HairlineRipple — concentric monoline rings that emanate from a circle.
 *
 * Editorial paper/hairline register: thin rings spawn at the dot edge and
 * travel outward, fading as they go. At rest they spawn on a slow heartbeat
 * cadence (lub-dub … pause). When audio is flowing, the spawn rate and stroke
 * opacity rise with amplitude, so loud passages ripple faster and brighter.
 *
 * Two input modes (mirrors the prior RadialBlob contract, so it's a drop-in):
 * - **Live (recording):** reads frequency data each frame from AnalyserNode.
 * - **Static (playback):** reads pre-computed peaks at `progress`.
 *
 * Reduced motion: renders a single static set of evenly-spaced faint rings and
 * starts no RAF — the canvas path that `prefers-reduced-motion` could not reach
 * through framer-motion's <MotionConfig> before.
 *
 * The canvas is sized larger than the dot to accommodate the outward rings and
 * must be positioned absolutely over the dot by the parent.
 */
export function HairlineRipple({
    analyser,
    peaks,
    progress = 0,
    dotSize,
    reach = 24,
    active = false,
    color,
    reducedMotion = false,
}: HairlineRippleProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rafRef = useRef<number>(0);
    // Live values read inside the RAF without restarting the effect each frame.
    const peaksRef = useRef<number[]>([]);
    const progressRef = useRef(0);
    peaksRef.current = peaks ?? [];
    progressRef.current = progress;
    // Persist active rings across effect re-runs (e.g. a dotSize/reach change
    // mid-recording) so the ripples don't all pop out and respawn from scratch.
    const ringsRef = useRef<Ring[]>([]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const canvasSize = dotSize + reach * 2;
        canvas.width = canvasSize * dpr;
        canvas.height = canvasSize * dpr;
        canvas.style.width = `${canvasSize}px`;
        canvas.style.height = `${canvasSize}px`;
        ctx.scale(dpr, dpr);

        const cx = canvasSize / 2;
        const cy = canvasSize / 2;
        const baseRadius = dotSize / 2;

        // Resolve primary color from CSS variable (or override / fallback).
        const resolved = (() => {
            if (color) return color;
            const raw = getComputedStyle(document.documentElement)
                .getPropertyValue('--primary')
                .trim();
            if (!raw) return FALLBACK_PRIMARY;
            // `--primary` is normally a bare HSL fragment (`12 92% 58%`), but
            // tolerate an override that's already a fully-formed color string.
            if (raw.startsWith('#') || raw.startsWith('hsl(') || raw.startsWith('rgb(')) {
                return raw;
            }
            return `hsl(${raw})`;
        })();

        const drawRing = (radius: number, alpha: number) => {
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.strokeStyle = withAlpha(resolved, alpha);
            ctx.lineWidth = 1; // hairline
            ctx.stroke();
        };

        // --- Reduced-motion: one static resting frame, no animation loop ----
        if (reducedMotion) {
            ctx.clearRect(0, 0, canvasSize, canvasSize);
            for (let i = 0; i < STATIC_RINGS; i++) {
                const t = i / (STATIC_RINGS - 1);
                drawRing(baseRadius + t * reach, (1 - t) * 0.22);
            }
            return;
        }

        // --- Animated ------------------------------------------------------
        const freq = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
        const getLevel = (): number => {
            if (analyser && freq && active) {
                analyser.getByteFrequencyData(freq);
                let sum = 0;
                for (let i = 0; i < freq.length; i++) sum += freq[i];
                return sum / freq.length / 255;
            }
            const p = peaksRef.current;
            if (p.length > 0 && active) {
                const idx = Math.floor((progressRef.current % 1) * p.length) % p.length;
                return p[idx] ?? 0;
            }
            return 0;
        };

        const rings = ringsRef.current;
        let sinceSpawn = 0;
        let beatPhase = 0; // toggles the heartbeat lub/dub gap
        let last = performance.now();

        const draw = (now: number) => {
            const dt = now - last;
            last = now;
            const level = getLevel();

            // Spawn cadence: heartbeat at rest, amplitude-driven when audible.
            sinceSpawn += dt;
            const interval =
                level > 0.03
                    ? Math.max(FAST_INTERVAL_MS, HEARTBEAT_PAUSE_MS * (1 - level))
                    : beatPhase === 0
                      ? HEARTBEAT_LUB_MS
                      : HEARTBEAT_PAUSE_MS;
            if (sinceSpawn >= interval) {
                sinceSpawn = 0;
                beatPhase = 1 - beatPhase;
                rings.push({ age: 0, strength: 0.3 + level * 0.7 });
            }

            ctx.clearRect(0, 0, canvasSize, canvasSize);
            // Faint resting ring hugging the dot edge.
            drawRing(baseRadius, 0.12);

            for (let i = rings.length - 1; i >= 0; i--) {
                const ring = rings[i];
                ring.age += dt;
                const t = ring.age / RING_LIFE_MS;
                if (t >= 1) {
                    rings.splice(i, 1);
                    continue;
                }
                // Ease-out travel, linear fade.
                const eased = 1 - (1 - t) * (1 - t);
                drawRing(baseRadius + eased * reach, (1 - t) * ring.strength * STROKE_MAX_ALPHA);
            }

            rafRef.current = requestAnimationFrame(draw);
        };

        rafRef.current = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(rafRef.current);
    }, [analyser, dotSize, reach, active, color, reducedMotion]);

    const canvasSize = dotSize + reach * 2;
    return (
        <canvas
            ref={canvasRef}
            className="absolute pointer-events-none"
            style={{
                width: canvasSize,
                height: canvasSize,
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
            }}
        />
    );
}
