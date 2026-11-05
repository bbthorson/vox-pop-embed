import type { RecorderErrorKind, RecorderInterruption } from '@antiphony/capture-kit';

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
        case 'interrupted':
            // The take was cut off before a single chunk was encoded — almost
            // always the screen locking or the page being left on a phone the
            // moment recording began. Nothing to offer back, so it is a retry.
            return 'Recording stopped before any audio was captured. Keep this screen open while you record, then try again.';
        case 'unknown':
            return 'Could not start recording. Please check your microphone and try again.';
    }
}

/**
 * Vox Pop's words for a take the kit ended on its own — the microphone went
 * quiet or away mid-recording (`recording.interruption`).
 *
 * Shown *alongside* the take, not instead of it: the audio up to the
 * interruption is kept, and it is usually most of what the person meant to
 * say. So every message ends the same way — listen back, then decide.
 *
 * `muted` is overwhelmingly a phone whose browser stopped capture when the
 * screen locked or the person switched apps. Every iOS browser does this and no
 * web API prevents it, so the copy tells them what to do next time rather than
 * apologising for something we could have fixed.
 */
export function recorderInterruptionMessage(interruption: RecorderInterruption): string {
    switch (interruption) {
        case 'muted':
            return 'Recording stopped when the microphone went quiet — this happens if you leave the page or your screen locks. Listen back, then send it or record again.';
        case 'device-lost':
            return 'Recording stopped because the microphone disconnected. Listen back, then send it or record again.';
        case 'recorder-error':
            return 'Recording stopped unexpectedly. Listen back, then send it or record again.';
    }
}
