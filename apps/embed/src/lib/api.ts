import { z } from 'zod';

import { VOXPOP_API_BASE_URL } from './config';

/**
 * The embed's read layer — two anonymous GETs against the Vox Pop BFF
 * (Stream 4 F7 B).
 *
 * It replaces core-api's single `GET /prompts/public/:handle/:promptId`, which
 * composed `{user, prompt}` server-side. The BFF has no such composite route
 * (its prompt read is Antiphony-backed and identity-free — profiles are an
 * app-layer join), so the embed does the two public reads itself and joins
 * them, exactly as apps/public's prompt page does with its two serverProxy
 * calls.
 *
 * **Schemas are lean by design.** They model only the fields the embed
 * renders, not the full Antiphony post view. Two reasons: this is a
 * bundle-sensitive iframe app (pulling the shared schema graph in would drag
 * the whole record/view tree with it), and a client that hard-fails on an
 * upstream field it never reads is a liability. Unknown keys are stripped;
 * the fields we DO render are validated (no casts across the trust boundary).
 */

/**
 * Reusable http/https scheme allowlist refinement.
 *
 * `z.string().url()` accepts any scheme including `javascript:`, `data:`, and
 * `vbscript:`, which are stored-XSS vectors when values land in an `<a href>`.
 * Wrap any URL field that came off the wire with this instead of bare `.url()`.
 *
 * Audit ref: M7 — javascript: URLs in profile links.
 *
 * **Deliberately a copy of `@vox-pop/shared`'s helper, not an import of it.**
 * This was the embed's only dependency on that package, and importing it by
 * subpath still pulled `types/records` — and, transitively, `types/blob` —
 * into a bundle that ships inside third-party iframes, for eight lines of Zod.
 * Dropping it leaves the embed depending on `@vox-pop/brand-ui` and
 * `@vox-pop/design-tokens` alone, which is what makes it a genuine leaf: see
 * `specs/architecture.md` § "Four web products", where the embed is the one
 * client marked open/mirrored.
 *
 * The duplication is the point, but it is a *validator*, so keep the two in
 * step if the scheme allowlist ever changes.
 */
function httpsUrl() {
    return z
        .string()
        .trim() // normalize accidental copy/paste whitespace before validating
        .url()
        .refine((u) => /^https?:\/\//i.test(u), {
            message: 'URL must use the http or https scheme',
        });
}

/** An API call that failed. `status` is 0 for network/parse failures. */
export class ApiError extends Error {
    constructor(message: string, readonly status: number) {
        super(message);
        this.name = 'ApiError';
    }
}

/**
 * Antiphony's hydrated audio embed. `url` points at Antiphony's audio proxy,
 * which streams the bytes — already playable, so the embed plays it directly
 * and makes no Vox Pop API call for audio.
 */
const AudioEmbedViewSchema = z.object({
    url: httpsUrl(),
    /** Peaks are 0–100 ints on the wire; brand-ui wants 0–1 (see `toEmbedPrompt`). */
    waveform: z.array(z.number()).nullish(),
});

/**
 * The BFF's composed prompt view (`GET /api/v1/prompts/:postId`).
 *
 * Absent fields are `.nullish()`, not `.optional()`: today's wire omits them
 * (JSON.stringify drops `undefined`), but a client whose whole render is an
 * iframe must not blank out because an upstream serializer someday emits an
 * explicit `null`. Every consumer already reads these through `?.` / `??`.
 */
const PromptViewSchema = z.object({
    uri: z.string(),
    kind: z.enum(['prompt', 'reply']),
    authorId: z.string(),
    record: z.object({
        /** The body. Antiphony's `title` is the headline; `text` is the body. */
        text: z.string(),
        title: z.string().nullish(),
    }),
    embed: AudioEmbedViewSchema.nullish(),
});
export type PromptView = z.infer<typeof PromptViewSchema>;

/** The BFF's public profile projection (`GET /api/v1/users/:handle`). */
const ProfileViewSchema = z.object({
    id: z.string(),
    handle: z.string().nullish(),
    displayName: z.string().nullish(),
});
export type ProfileView = z.infer<typeof ProfileViewSchema>;

/** The success half of the API's response envelope. */
const EnvelopeSchema = z.object({ success: z.literal(true), data: z.unknown() });

/**
 * GET the BFF and unwrap `{ success, data }`. Throws `ApiError` on a non-2xx
 * (surfacing the server's own message where the error envelope carries one) or
 * on a payload that doesn't match `schema`.
 *
 * The envelope and the payload are parsed in two steps rather than as one
 * nested schema: zod can't infer `T` back out of a `z.object` built around a
 * generic `z.ZodType<T>`.
 */
async function getJson<T>(path: string, schema: z.ZodType<T>, signal: AbortSignal): Promise<T> {
    const res = await fetch(`${VOXPOP_API_BASE_URL}${path}`, { signal });

    if (!res.ok) {
        const body = await res.json().catch(() => null);
        const message = (body as { error?: { message?: string } } | null)?.error?.message;
        throw new ApiError(message || `Request failed (${res.status}).`, res.status);
    }

    const body = await res.json().catch(() => null);
    const envelope = EnvelopeSchema.safeParse(body);
    if (!envelope.success) {
        throw new ApiError('Unexpected response from the server.', 0);
    }

    const parsed = schema.safeParse(envelope.data.data);
    if (!parsed.success) {
        throw new ApiError('Unexpected response from the server.', 0);
    }
    return parsed.data;
}

/**
 * Fetch the prompt + its creator, in parallel.
 *
 * Ownership is verified here (the prompt must belong to the handle in the URL),
 * mirroring the 404 core-api's composite route returned on mismatch. Not a
 * security boundary — a prompt is public by id either way — but it stops an
 * arbitrary prompt from being rendered under someone else's name.
 *
 * Handles are user-only, matching the endpoint this replaces (it resolved via
 * `userService.getUserData`); org slugs were never embeddable.
 */
export async function fetchEmbedData(
    handle: string,
    promptId: string,
    signal: AbortSignal,
): Promise<{ user: ProfileView; prompt: PromptView }> {
    const [prompt, user] = await Promise.all([
        getJson(`/api/v1/prompts/${encodeURIComponent(promptId)}`, PromptViewSchema, signal),
        getJson(`/api/v1/users/${encodeURIComponent(handle)}`, ProfileViewSchema, signal),
    ]);

    if (prompt.kind !== 'prompt' || prompt.authorId !== user.id) {
        throw new ApiError('Prompt not found.', 404);
    }

    return { user, prompt };
}
