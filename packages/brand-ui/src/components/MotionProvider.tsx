'use client';

import { LazyMotion, domAnimation } from 'framer-motion';
import type { ReactNode } from 'react';

/**
 * LazyMotion feature provider — animation only, NO layout projection.
 *
 * Every motion-using component in this package renders `m.*` rather than
 * `motion.*`. `motion.*` is a proxy that statically pulls framer-motion's
 * whole feature set (114 kB raw / 38 kB gzip) into any bundle that touches it;
 * `m.*` ships only the component shell and takes its features from the nearest
 * `LazyMotion` ancestor. That is what lets the embed load the animation subset
 * and leave layout projection out.
 *
 * ⚠️ `m.*` REQUIRES one of these providers above it. Without an ancestor the
 * elements render but never animate, and a `layout`/`layoutId` prop under this
 * (animation-only) provider is silently inert. Use `MotionProviderMax` for any
 * tree that needs layout animations — see that file.
 *
 * Deliberately a separate module from `MotionProviderMax`: importing
 * `domAnimation` and `domMax` from one file would bundle both and defeat the
 * whole exercise.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
    return <LazyMotion features={domAnimation}>{children}</LazyMotion>;
}
