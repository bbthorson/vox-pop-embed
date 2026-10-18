import type { RecorderErrorKind } from '@antiphony/capture-kit';

/**
 * Vox Pop's words for a microphone that would not open.
 *
 * `@antiphony/capture-kit` classifies and deliberately stops there — its
 * `RecorderErrorKind` is a fact about the browser, while *what you say to a
 * person about it* is a product judgement, and one that reads differently in a
 * dashboard than in an iframe on someone else's site. The kit's raw `error` is
 * a DOMException message (`"Permission denied"`, and worse in other locales);
 * it is diagnostic text, not something to show a responder.
 *
 * Branching on the discriminant rather than matching substrings of that message
 * is the point of the kind existing: the message wording is per-browser and
 * per-locale, so a substring match is a bug waiting for a Firefox release.
 *
 * **Why the friendly string matters here specifically.** ReplyDot flips to its
 * `recording` phase optimistically, before `getUserMedia` has resolved. When
 * the mic was denied and nothing surfaced a message, the user was left looking
 * at a Stop button for a recording that never started, with no way back to idle
 * but a page reload. The copy and the phase reset are one fix, not two.
 */
export function recorderErrorMessage(kind: RecorderErrorKind): string {
    switch (kind) {
        case 'permission-denied':
            // Also the classification for `SecurityError`, which is what a
            // permissions-policy block raises — an embed iframe missing
            // `allow="microphone"`. Indistinguishable from a user saying no
            // from inside the page, and the same instruction helps both: the
            // browser's own permission UI is where either gets resolved.
            return 'Microphone access was denied. Please allow microphone access in your browser settings and try again.';
        case 'no-device':
            return 'No microphone found. Please connect a microphone and try again.';
        case 'unsupported':
            // Usually an insecure origin: `getUserMedia` is undefined on plain
            // http, which is a page problem rather than anything the user can
            // fix in settings — so this is the one message that does not tell
            // them to go and change something.
            return 'Recording isn’t supported here. This page needs a secure (https) connection and a recent browser.';
        case 'unknown':
            return 'Could not start recording. Please check your microphone and try again.';
    }
}
