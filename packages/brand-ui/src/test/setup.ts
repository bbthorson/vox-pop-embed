// Types only: gives `tsc -p tsconfig.test.json` the jest-dom matchers. The
// runtime import lives in vitest-config/jsdom-setup.ts, outside this package.
/// <reference types="@testing-library/jest-dom/vitest" />
import { vi, beforeEach } from 'vitest';

/**
 * jest-dom and the generic jsdom shims (ResizeObserver among them) come from
 * vitest-config/jsdom-setup.ts. What is left here is specific to the dot
 * family: jsdom implements no media playback, and `ListenDot` calls `play()`
 * on every tap.
 *
 * `play()` defaults to resolving. Tests that care about the failure path
 * override it per-case (`mockRejectedValue(new DOMException(…, 'NotAllowedError'))`)
 * — that rejection is the whole reason this component has an error state.
 */
beforeEach(() => {
    vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(window.HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
});

// jsdom has no layout engine, so every element measures 0 — which would keep
// `useContainerSize` at 0 and suppress the size-gated parts of the dots (the
// ripple, ReplyDot's review flanks). Report a plausible dot diameter instead.
Object.defineProperty(window.HTMLElement.prototype, 'offsetWidth', {
    configurable: true,
    get: () => 200,
});

// Blob URLs — ReplyDot mints one for the recording it hands to the preview.
// jsdom ships neither method (the static type says otherwise, hence the cast).
const urlStatics = URL as unknown as {
    createObjectURL: (blob: Blob) => string;
    revokeObjectURL: (url: string) => void;
};
urlStatics.createObjectURL = () => 'blob:mock';
urlStatics.revokeObjectURL = () => {};

// HairlineRipple / CaptureSweep draw to a canvas. jsdom has no 2D context and
// logs a loud "Not implemented" for every attempt; both components bail on a
// null context, so hand them one and keep the test output readable.
window.HTMLCanvasElement.prototype.getContext = (() =>
    null) as unknown as HTMLCanvasElement['getContext'];
