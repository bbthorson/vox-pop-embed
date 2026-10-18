import { describe, it, expect } from 'vitest';
import type { RecorderErrorKind } from '@antiphony/capture-kit';
import { recorderErrorMessage } from './recorder-copy';

/**
 * Every kind the kit can classify must map to something a person can act on.
 * The list is exhaustive on purpose: `RecorderErrorKind` is a published union,
 * and a kind added upstream should fail here rather than fall through to
 * `undefined` on screen.
 */
const KINDS: RecorderErrorKind[] = ['permission-denied', 'no-device', 'unsupported', 'unknown'];

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
