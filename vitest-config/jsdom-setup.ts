import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

/**
 * The jsdom shims every React workspace needs, installed by `reactPreset`
 * ahead of each workspace's own `setupFiles`.
 *
 * Before this file, apps/web, apps/public, packages/ui and packages/web-auth
 * each carried a ~50-line copy of these stubs (and brand-ui a partial one),
 * and the copies had already drifted — `props` was optional in two and
 * required in two. A workspace's own setup file now holds only what is
 * genuinely local: fake-indexeddb, media playback, canvas.
 *
 * Every stub here fills a hole jsdom leaves, so none of them changes behaviour
 * a real browser would have; they only stop components from throwing on
 * missing APIs.
 */

/**
 * Unmount whatever the last test rendered.
 *
 * Testing Library registers this itself — but only when it finds a global
 * `afterEach`, and the presets run with `globals: false`. Without this line
 * every render would stay mounted into the next test's `document.body`.
 */
afterEach(() => {
    cleanup();
});

/** Radix UI primitives dispatch and read PointerEvents; jsdom has none. */
class MockPointerEvent extends Event {
    button: number;
    ctrlKey: boolean;
    pointerType: string;

    constructor(type: string, props: PointerEventInit = {}) {
        super(type, props);
        this.button = props.button || 0;
        this.ctrlKey = props.ctrlKey || false;
        this.pointerType = props.pointerType || 'mouse';
    }
}

// A file can opt into `// @vitest-environment node` (bff-client's server-side
// tests do), and setup files still run there — with no `window`.
if (typeof window !== 'undefined') {
    window.PointerEvent = MockPointerEvent as unknown as typeof PointerEvent;
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    // A tab's reset-to-list scrolls its list pane to the top.
    window.HTMLElement.prototype.scrollTo = vi.fn();
    window.HTMLElement.prototype.hasPointerCapture = vi.fn();
    window.HTMLElement.prototype.releasePointerCapture = vi.fn();

    // Class-based, not `vi.fn()`: callers `new` it, and a plain function mock
    // fails with "is not a constructor".
    window.ResizeObserver = class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
    };

    window.requestAnimationFrame = vi.fn((cb) => setTimeout(cb, 0) as unknown as number);
    window.cancelAnimationFrame = vi.fn((id) => clearTimeout(id));

    // Default to "doesn't match" so useMediaQuery-driven components (WorkspaceLayout
    // et al.) take the mobile breakpoint path; a test that needs desktop layout
    // overrides it per-test.
    if (!window.matchMedia) {
        window.matchMedia = vi.fn().mockImplementation((query: string) => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        }));
    }
}
