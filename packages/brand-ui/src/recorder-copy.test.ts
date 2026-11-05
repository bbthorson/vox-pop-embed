import { describe, it, expect } from 'vitest';
import type { RecorderErrorKind, RecorderInterruption } from '@antiphony/capture-kit';
import { recorderErrorMessage, recorderInterruptionMessage } from './recorder-copy';

/**
 * Every kind the kit can classify must map to something a person can act on.
 * The list is exhaustive on purpose: `RecorderErrorKind` is a published union,
 * and a kind added upstream should fail here rather than fall through to
 * `undefined` on screen.
 */
const KINDS: RecorderErrorKind[] = ['permission-denied', 'no-device', 'unsupported', 'interrupted', 'unknown'];

describe('recorderErrorMessage', () => {
    it.each(KINDS)('gives %s a non-empty, human message', (kind) => {
        const message = recorderErrorMessage(kind);
        expect(message).toBeTruthy();
        expect(message).toMatch(/[.!?]$/);
        // The kit's raw DOMException text is diagnostic, not copy. If a kind
        // name leaks into the string, someone passed the discriminant through.
        expect(message).not.toContain(kind);
    });

    it('gives every kind its own message', () => {
        expect(new Set(KINDS.map(recorderErrorMessage)).size).toBe(KINDS.length);
    });

    it('tells a denied mic where to fix it', () => {
        // `permission-denied` also covers `SecurityError` — an embed iframe
        // without `allow="microphone"`. Browser settings is the right pointer
        // for both, which is why one message serves them.
        expect(recorderErrorMessage('permission-denied')).toContain('browser settings');
    });

    it('does not tell an unsupported browser to change a setting', () => {
        // Usually an insecure origin — a page problem the user cannot resolve
        // in a permissions dialog, so sending them there would be a dead end.
        expect(recorderErrorMessage('unsupported')).not.toContain('settings');
    });
});

/** Exhaustive for the same reason as `KINDS`: a published union. */
const INTERRUPTIONS: RecorderInterruption[] = ['muted', 'device-lost', 'recorder-error'];

describe('recorderInterruptionMessage', () => {
    it.each(INTERRUPTIONS)('gives %s a non-empty, human message', (interruption) => {
        const message = recorderInterruptionMessage(interruption);
        expect(message).toMatch(/[.!?]$/);
        expect(message).not.toContain(interruption);
        // The take is kept and shown in review, so every message points the
        // person at it rather than implying it is gone.
        expect(message).toMatch(/listen back/i);
    });

    it('gives every interruption its own message', () => {
        expect(new Set(INTERRUPTIONS.map(recorderInterruptionMessage)).size).toBe(INTERRUPTIONS.length);
    });

    it('tells a muted take what caused it', () => {
        // Overwhelmingly a phone whose browser stopped capture on screen lock
        // or app switch — the one thing the person can do differently.
        expect(recorderInterruptionMessage('muted')).toMatch(/screen locks/);
    });
});

describe('recorderErrorMessage — interrupted', () => {
    it('asks for a retry with the screen kept open', () => {
        // Nothing was captured, so unlike an interruption there is no take to
        // listen back to.
        expect(recorderErrorMessage('interrupted')).toMatch(/keep this screen open/i);
        expect(recorderErrorMessage('interrupted')).not.toMatch(/listen back/i);
    });
});
