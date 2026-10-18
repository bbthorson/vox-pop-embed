/**
 * Declare the page's audio-session category to WebKit's Audio Session API
 * (`navigator.audioSession`, Safari 16.4+). No-op everywhere else.
 *
 * Why this exists: on iOS, WebKit infers the category from what the page has
 * used. A page that has only ever played `<audio>` gets `playback`, which
 * ignores the ringer switch. But once the page has opened the mic or an
 * `AudioContext` (the recorder does both, for the ripple), the inferred
 * category can stick on one that OBEYS the switch until reload. So a
 * listener with the ringer off saw the prompt "playing" but heard nothing,
 * and only a reload brought the sound back.
 *
 * Declare the category explicitly at every transition instead:
 * - `playback` right before an intentional, user-initiated `play()`, so it is
 *   heard with the ringer off, like any other media app.
 * - `play-and-record` right before opening the mic, because `playback` does
 *   not permit capture.
 */
export type AudioSessionType = 'playback' | 'play-and-record';

export function setAudioSessionType(type: AudioSessionType): void {
  if (typeof navigator === 'undefined' || !('audioSession' in navigator)) return;
  // Not in TS's DOM lib yet, so read and write it structurally instead of
  // casting: a shape we don't expect stays a no-op.
  const session: unknown = Reflect.get(navigator, 'audioSession');
  if (typeof session !== 'object' || session === null || !('type' in session)) return;
  try {
    Reflect.set(session, 'type', type);
  } catch {
    /* an unknown category throws on some builds; fall back to WebKit's inference */
  }
}
