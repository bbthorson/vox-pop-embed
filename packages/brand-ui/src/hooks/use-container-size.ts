'use client';

import { useState, useEffect, useRef } from 'react';

/**
 * useContainerSize — Measures and tracks the width of a container element.
 *
 * Returns a ref to attach to the container and the current width in pixels.
 * Uses ResizeObserver for efficient updates on resize.
 *
 * Used by ListenDot and ReplyDot to size the HairlineRipple canvas to match
 * the dynamic dot diameter.
 */
export function useContainerSize() {
    const containerRef = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState(0);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const measure = () => setSize(el.offsetWidth);
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    return { containerRef, size };
}
