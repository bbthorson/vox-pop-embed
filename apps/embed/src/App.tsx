import { useEffect, useState } from 'react';
import { EmbedPrompt } from '@vox-pop/brand-ui';

import { REPLY_MAX_DURATION_MS } from 'shared/types/audio-limits';

import { VOXPOP_API_BASE_URL, HOST_APP_BASE_URL } from './lib/config';
import { ApiError, fetchEmbedData, type ProfileView, type PromptView } from './lib/api';

/**
 * Parse `{handle, promptId}` from the URL.
 *
 * Path-based, mirroring the public prompt page's `/@handle/promptId` URL, so
 * an embed URL is the prompt page URL with the embed's host swapped in.
 * The leading `@` on the handle segment is optional; trimmed if present
 * so the URL normalization matches the API's handle space.
 */
function parseRoute(pathname: string): { handle: string; promptId: string } | null {
    // Strip leading slash, decode each segment. `decodeURIComponent`
    // throws `URIError` on malformed escape sequences (e.g. a trailing
    // `%`); treat that as an unparseable route rather than a crash.
    try {
        const segments = pathname.replace(/^\/+/, '').split('/').filter(Boolean);
        if (segments.length < 2) return null;
        const handle = decodeURIComponent(segments[0]).replace(/^@/, '').toLowerCase();
        const promptId = decodeURIComponent(segments[1]);
        if (!handle || !promptId) return null;
        return { handle, promptId };
    } catch {
        return null;
    }
}

type State =
    | { phase: 'loading' }
    | { phase: 'error'; message: string }
    | { phase: 'ready'; user: ProfileView; prompt: PromptView };

export function App() {
    const [state, setState] = useState<State>({ phase: 'loading' });

    useEffect(() => {
        const route = parseRoute(window.location.pathname);
        if (!route) {
            setState({
                phase: 'error',
                message:
                    'Missing handle or prompt ID. Embed URLs look like /@handle/promptId.',
            });
            return;
        }

        const controller = new AbortController();

        (async () => {
            try {
                const { user, prompt } = await fetchEmbedData(
                    route.handle,
                    route.promptId,
                    controller.signal,
                );
                setState({ phase: 'ready', user, prompt });
            } catch (err: unknown) {
                if (err instanceof Error && err.name === 'AbortError') return;
                // A missing prompt and a missing creator are the same 404 to a
                // visitor — neither is worth a distinct message.
                if (err instanceof ApiError && err.status === 404) {
                    setState({ phase: 'error', message: 'Prompt not found.' });
                    return;
                }
                setState({
                    phase: 'error',
                    message: err instanceof Error ? err.message : 'Network error.',
                });
            }
        })();

        return () => controller.abort();
    }, []);

    if (state.phase === 'loading') {
        // Intentionally minimal — a flash of skeleton text would be
        // more distracting than empty space in a small iframe.
        return (
            <div className="theme-editorial flex h-full w-full items-center justify-center bg-background" />
        );
    }

    if (state.phase === 'error') {
        return (
            <div className="theme-editorial flex h-full w-full items-center justify-center bg-background px-4 text-center">
                <p className="text-sm text-ink-muted">{state.message}</p>
            </div>
        );
    }

    return <EmbedView user={state.user} prompt={state.prompt} />;
}

/**
 * Embed composition — renders the shared `EmbedPrompt` from
 * `@vox-pop/brand-ui`, the single source of the embed layout. apps/public's
 * `?mode=embed` renders the same component, so the chrome-less iframe looks
 * identical across origins.
 *
 * The only apps/embed-specific concern is the origins (build-time env rather
 * than `APP_CONFIG`, because apps/embed is cross-origin from both).
 */
function EmbedView({ user, prompt }: { user: ProfileView; prompt: PromptView }) {
    const promptId = prompt.uri.slice(prompt.uri.lastIndexOf('/') + 1);

    return (
        <EmbedPrompt
            promptId={promptId}
            // Antiphony splits headline/body as `title`/`text`. An untitled
            // prompt promotes its body to the headline (as the dashboard does)
            // — and then drops the lede, so the same text doesn't render twice.
            title={prompt.record.title ?? prompt.record.text}
            description={prompt.record.title ? prompt.record.text : undefined}
            // `embed.url` is already a signed, playable URL — no proxy hop.
            audioUrl={prompt.embed?.url}
            // Antiphony peaks are 0–100; brand-ui's ripple wants 0–1.
            waveformPeaks={prompt.embed?.waveform?.map((n) => n / 100)}
            handle={user.handle || undefined}
            displayName={user.displayName || undefined}
            voxPopApiBaseUrl={VOXPOP_API_BASE_URL}
            hostAppBaseUrl={HOST_APP_BASE_URL}
            // The same reply ceiling the public page and the phone line
            // enforce. This is the app's one value import from `shared/*`
            // — see the alias note in vite.config.ts.
            maxDurationMs={REPLY_MAX_DURATION_MS}
        />
    );
}
