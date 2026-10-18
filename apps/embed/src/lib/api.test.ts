import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiError, fetchEmbedData } from './api';

/**
 * The embed's read layer is its trust boundary: everything it renders inside a
 * third-party page comes through these two GETs, so the validation here is the
 * only thing between a bad upstream value and an `<audio src>` or a byline.
 */

const PROMPT = {
    uri: 'at://did:plc:x/dev.antiphony.audio.post/p1',
    kind: 'prompt',
    authorId: 'u-creator',
    record: { text: 'Tell me about your week', title: 'Weekly check-in' },
    embed: { url: 'https://api.antiphony.dev/api/v1/audio?url=x', waveform: [0, 50, 100] },
};

const PROFILE = { id: 'u-creator', handle: 'my.show', displayName: 'My Show' };

const ok = (data: unknown) => new Response(JSON.stringify({ success: true, data }), { status: 200 });

/** Answer the prompt and profile reads with the given payloads. */
function serve(prompt: unknown, profile: unknown = PROFILE) {
    vi.mocked(fetch).mockImplementation(async (input) => {
        const url = String(input);
        if (url.includes('/api/v1/prompts/')) return ok(prompt);
        if (url.includes('/api/v1/users/')) return ok(profile);
        return new Response(null, { status: 404 });
    });
}

const load = () => fetchEmbedData('my.show', 'p1', new AbortController().signal);

beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
});

describe('fetchEmbedData', () => {
    it('joins the prompt and its creator', async () => {
        serve(PROMPT);

        const { user, prompt } = await load();

        expect(user.handle).toBe('my.show');
        expect(prompt.record.title).toBe('Weekly check-in');
        expect(prompt.embed?.url).toBe(PROMPT.embed.url);
    });

    it('URL-encodes the handle and prompt id into the request paths', async () => {
        serve(PROMPT);

        await fetchEmbedData('my show', 'p/1', new AbortController().signal);

        const urls = vi.mocked(fetch).mock.calls.map(([input]) => String(input));
        expect(urls).toContain('http://localhost:8091/api/v1/prompts/p%2F1');
        expect(urls).toContain('http://localhost:8091/api/v1/users/my%20show');
    });

    it.each(['javascript:alert(1)', 'data:audio/mp3;base64,AAAA'])(
        'refuses a non-http audio URL (%s) rather than rendering it',
        async (url) => {
            serve({ ...PROMPT, embed: { url } });

            await expect(load()).rejects.toMatchObject({ name: 'ApiError', status: 0 });
        },
    );

    it("404s a prompt that is not the handle's, so it cannot render under someone else's name", async () => {
        serve({ ...PROMPT, authorId: 'u-someone-else' });

        await expect(load()).rejects.toMatchObject({ status: 404, message: 'Prompt not found.' });
    });

    it('404s a reply addressed as if it were a prompt', async () => {
        serve({ ...PROMPT, kind: 'reply' });

        await expect(load()).rejects.toMatchObject({ status: 404 });
    });

    it('tolerates explicit nulls for fields the wire usually omits', async () => {
        serve({ ...PROMPT, embed: null, record: { text: 'body', title: null } }, { ...PROFILE, handle: null });

        const { prompt } = await load();
        expect(prompt.embed).toBeNull();
    });

    it("surfaces the server's error message and status on a non-2xx", async () => {
        // A fresh Response per call: both reads run in parallel, and a body
        // can only be consumed once.
        vi.mocked(fetch).mockImplementation(
            async () =>
                new Response(JSON.stringify({ success: false, error: { message: 'Prompt is closed' }, requestId: 'r' }), {
                    status: 410,
                }),
        );

        const err = await load().catch((e: unknown) => e);
        expect(err).toBeInstanceOf(ApiError);
        expect(err).toMatchObject({ status: 410, message: 'Prompt is closed' });
    });

    it('fails with a generic message when the body is not an envelope', async () => {
        vi.mocked(fetch).mockImplementation(async () => new Response('<html>gateway</html>', { status: 200 }));

        await expect(load()).rejects.toMatchObject({ status: 0, message: 'Unexpected response from the server.' });
    });
});
