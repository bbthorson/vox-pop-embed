/**
 * How long a single recording may run, in milliseconds — the one place the
 * answer is written down.
 *
 * Same reasoning as `./prompt-share.ts` next door: a duration cap is a
 * **product decision, not a transport detail**, and it is enforced on five
 * surfaces that share no code (the dashboard's prompt recorder, the public
 * capture page, the off-site embed, the phone app, and Twilio's `<Record>`
 * verb). Stated once here, or five clients invent five answers — which is
 * exactly what had happened before this file existed:
 *
 * | Surface | Cap before this module |
 * | :--- | :--- |
 * | apps/mobile | 10 minutes (`MAX_RECORDING_MS`, its own constant) |
 * | Telephony | **60 minutes** — Twilio's `<Record>` default, never set |
 * | apps/web / apps/public / apps/embed | **none** — the capture-kit hook was called with no `maxDurationMs` |
 * | BFF | bytes only — 25MB, which at Opus mono is ~100 minutes |
 *
 * ## Why these numbers
 *
 * **Prompts are short because a prompt is a question.** The page carries a
 * title and a description for context; the audio is the ask, and a 90-second
 * ask is already a long one. Two things also fall out of the cap: a prompt
 * short enough to finish is a prompt more people answer, and a fixed ceiling
 * makes the shareable audiogram a predictable render rather than an open-ended
 * encoding problem. The upper bound on any future "post this prompt to
 * Bluesky" work is ~3 minutes (`app.bsky.embed.video`), so 90s deliberately
 * leaves room for a CTA outro inside that budget.
 *
 * **Replies are longer because they are the raw material.** Nothing about
 * distribution constrains them — a reply is never posted anywhere. What
 * constrains them is cost that scales with duration (Antiphony's transcription
 * is billed per minute upstream, Clef scoring scales with the transcript,
 * Twilio bills the call itself) and the creator's attention when triaging at
 * volume. Five minutes bounds both at a number you can multiply.
 *
 * If a creator with a "call in and tell your story" format needs more, the next
 * step is a per-prompt override with these as the defaults — not a bigger
 * global number.
 *
 * ## These are ceilings, not targets
 *
 * Every consumer enforces the cap by **auto-stopping the take**, never by
 * refusing the upload afterwards. A recording that stops at the limit still
 * leaves the speaker with what they said; one rejected after the fact loses all
 * of it. `useAudioRecorder({ maxDurationMs })` in `@antiphony/capture-kit` and
 * `maxLength` on Twilio's `<Record>` both work that way, which is why the caps
 * are expressed in the units those two want.
 *
 * ## Existing recordings are unaffected
 *
 * The cap applies at capture time. Prompts and replies already stored over
 * these lengths stay valid and playable — nothing re-validates them, and
 * nothing should.
 */

/**
 * Longest prompt a creator can record. Ninety seconds.
 *
 * @see the module doc for why this is the short one.
 */
export const PROMPT_MAX_DURATION_MS = 90 * 1000;

/**
 * Longest reply a responder can leave. Five minutes.
 *
 * Applies to every capture door — the public page, the off-site embed, and a
 * phone voicemail — because a responder does not know or care which one they
 * came through, and a cap that differs per door is a cap that gets discovered
 * by accident.
 */
export const REPLY_MAX_DURATION_MS = 5 * 60 * 1000;

/**
 * The reply cap in whole seconds, for callers whose unit is seconds rather than
 * milliseconds — Twilio's `maxLength` attribute is the one that matters.
 *
 * Derived rather than written out a second time: two literals for one limit is
 * the drift this module exists to prevent.
 */
export const REPLY_MAX_DURATION_SECONDS = REPLY_MAX_DURATION_MS / 1000;
