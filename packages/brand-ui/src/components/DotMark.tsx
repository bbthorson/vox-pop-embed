'use client';

import React from 'react';
import { m } from 'framer-motion';
import { cn } from '../utils/cn';

const DOT_LABEL_MIN = 140;

export type DotMarkVariant = 'filled' | 'ring' | 'ghost';
export type DotMarkTone = 'primary' | 'accent-warm' | 'muted';

interface DotMarkProps {
    children?: React.ReactNode;
    /**
     * Visual treatment:
     * - `filled`: solid surface, heavy border, shadow — "content lives here"
     * - `ring`: transparent with outlined stroke — "awaiting content"
     * - `ghost`: muted, subtle — for merged or quiescent states
     */
    variant?: DotMarkVariant;
    /**
     * Color expression. `primary` is the canonical coral; `accent-warm` is the
     * editorial terracotta used for the reply dot; `muted` removes chroma.
     */
    tone?: DotMarkTone;
    /** Explicit pixel size. Overrides `className` sizing. */
    size?: number;
    /** Tailwind size fallback when `size` is not given. */
    className?: string;
    /** Inline style passthrough (merged with size when provided). */
    style?: React.CSSProperties;
    /** Optional small caps label rendered inside the circle. */
    label?: string;
    labelPosition?: 'top' | 'bottom';
    /** Framer Motion layoutId for smooth transitions between instances. */
    layoutId?: string;
}

/**
 * DotMark — the circular visual primitive used across Vox Pop public pages.
 *
 * Evolves the previous `components/ui/Dot.tsx` with an explicit variant/tone
 * system so the editorial register can express filled vs ring vs ghost without
 * hardcoded colors in consumers. Children render as interior content
 * (`ListenDot`, `ReplyDot`, icons, typography).
 */
export function DotMark({
    children,
    variant = 'filled',
    tone = 'primary',
    size,
    className,
    style,
    label,
    labelPosition = 'bottom',
    layoutId,
}: DotMarkProps) {
    const showLabel = label && (!size || size >= DOT_LABEL_MIN);
    const labelPosClass = labelPosition === 'top' ? 'top-[18%]' : 'bottom-[18%]';

    const variantClass =
        variant === 'filled'
            ? 'bg-surface-raised border-2 shadow-editorial'
            : variant === 'ring'
              ? 'bg-transparent border-2'
              : 'bg-surface-sunken border border-rule/60';

    const toneBorderClass =
        variant === 'filled'
            ? tone === 'primary'
                ? 'border-primary/30'
                : tone === 'accent-warm'
                  ? 'border-accent-warm/40'
                  : 'border-rule'
            : variant === 'ring'
              ? tone === 'primary'
                  ? 'border-primary/60'
                  : tone === 'accent-warm'
                    ? 'border-accent-warm/70'
                    : 'border-rule'
              : 'border-rule/50';

    const mergedStyle: React.CSSProperties = size
        ? { width: size, height: size, ...style }
        : style ?? {};

    // Only enable Framer's `layout` animation when `layoutId` is provided.
    // The two features only make sense together here (shared-element
    // transitions across the merge-state swap in `EditorialPublicPrompt`).
    // With fluid sizing (`size-[clamp(...)]` via className), leaving
    // `layout` on unconditionally causes a vmin tick to retrigger layout
    // measurement, which cancels inner enter-animations — most visibly
    // the ReplyDot mic button, which stalled at opacity ~0.1 in embed
    // mode before this gate was added.
    const enableLayoutAnim = !!layoutId;

    return (
        <m.div
            layout={enableLayoutAnim}
            layoutId={layoutId}
            className={cn(
                'rounded-full relative overflow-hidden flex items-center justify-center transition-colors',
                variantClass,
                toneBorderClass,
                className
            )}
            style={mergedStyle}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
            <div className="w-full h-full flex items-center justify-center">
                {children}
            </div>
            {showLabel && (
                <span
                    className={cn(
                        'absolute left-0 right-0 text-center pointer-events-none select-none',
                        'font-heading font-bold uppercase text-2xs tracking-[0.18em]',
                        tone === 'accent-warm' ? 'text-accent-warm/70' : 'text-ink-subtle',
                        labelPosClass
                    )}
                >
                    {label}
                </span>
            )}
        </m.div>
    );
}
