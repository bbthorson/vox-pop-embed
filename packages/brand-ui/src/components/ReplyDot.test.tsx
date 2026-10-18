import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PROMPT_CLOSED_MESSAGE, ReplyDot } from './ReplyDot';

/**
 * Stand in for `@antiphony/capture-kit`'s recorder — jsdom has no
 * MediaRecorder and no microphone.
 *
 * The kit is a state machine where the old brand-ui hook was callbacks, so the
 * mock has to be one too: `stop()` moves `status` to `recorded` and publishes a
 * `Recording`, and the component reacts to that transition rather than being
 * called back. Faking it with a callback would test a shape nothing implements.
 *
 * `previewUrl` matters — ReplyDot now reads the preview URL off the kit's
 * `Recording` instead of minting its own, so the review phase renders nothing
 * without it. `URL.createObjectURL` is not implemented in jsdom, hence the
 * literal.
 */
/**
 * Stand in for `@antiphony/capture-kit`'s recorder — jsdom has no
 * MediaRecorder and no microphone.
 *
 * The kit is a state machine where the old brand-ui hook was callbacks, so the
 * mock has to be one too: `stop()` moves `status` to `recorded` and publishes a
 * `Recording`, and the component reacts to that transition rather than being
 * called back. Faking it with a callback would test a shape nothing implements.
 *
 * `previewUrl` matters — ReplyDot now reads the preview URL off the kit's
 * `Recording` instead of minting its own, so the review phase renders nothing
 * without it. `URL.createObjectURL` is not implemented in jsdom, hence the
 * literal.
 *
 * `recorderOverride` lets one test drive the hook into a state the happy path
 * never reaches (a refused microphone). Set it before `render`, and note the
 * reset in `beforeEach` — a module mock outlives the test that configured it.
 */
const RECORDING = {
    blob: new Blob(['audio'], { type: 'audio/webm' }),
    mimeType: 'audio/webm',
    durationMs: 1200,
    previewUrl: 'blob:mock-recording',
};

/** A stand-in AnalyserNode — enough surface for HairlineRipple's read loop. */
const FAKE_ANALYSER = {
    frequencyBinCount: 128,
    fftSize: 256,
    getByteFrequencyData: vi.fn(),
} as unknown as AnalyserNode;

/**
 * A stand-in cap. The real number lives in
 * `@vox-pop/shared/types/audio-limits` and this package deliberately does not
 * depend on it — brand-ui is presentation and has no opinion about how long a
 * reply may run, which is exactly why `maxDurationMs` is a required prop rather
 * than a default. What is asserted below is that whatever the consumer passes
 * reaches the kit.
 */
const MAX_MS = 42_000;

let recorderOverride: Record<string, unknown> | null = null;
/** What `useAudioRecorder` was called with — asserted for the analyser opt-in. */
const recorderOptions = vi.fn();

vi.mock('@antiphony/capture-kit', () => ({
    useAudioRecorder: (options?: unknown) => {
        recorderOptions(options);
        const [status, setStatus] = React.useState<'idle' | 'recording' | 'recorded'>('recording');
        return {
            status,
            recording: status === 'recorded' ? RECORDING : null,
            error: null,
            errorKind: null,
            elapsedMs: status === 'recording' ? 1200 : 0,
            analyser: status === 'recording' ? FAKE_ANALYSER : null,
            start: vi.fn(),
            stop: () => setStatus('recorded'),
            reset: () => setStatus('recording'),
            ...recorderOverride,
        };
    },
}));

/**
 * Capture what `HairlineRipple` is handed. The ripple's own draw loop needs a
 * real canvas 2d context, which jsdom does not provide — but the thing this
 * cutover could silently break is upstream of the drawing: forgetting
 * `{ analyser: true }` leaves the node null forever, and the ripple quietly
 * falls back to its heartbeat instead of reacting to the voice. That is a
 * visual regression no type error catches, so assert the wiring instead.
 */
/**
 * jsdom reports every element as 0x0, so the measured dot size is 0 — and
 * ReplyDot only mounts the ripple once it has a size to draw against. Give it
 * a plausible one so the recording surface renders the way a browser would.
 */
vi.mock('../hooks/use-container-size', () => ({
    useContainerSize: () => ({ containerRef: { current: null }, size: 220 }),
}));

const rippleProps = vi.fn();
vi.mock('./HairlineRipple', () => ({
    HairlineRipple: (props: { analyser?: AnalyserNode | null }) => {
        rippleProps(props);
        return null;
    },
}));

beforeEach(() => {
    recorderOverride = null;
    rippleProps.mockClear();
    recorderOptions.mockClear();
});

async function recordSomething(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('button', { name: 'Start recording your reply' }));
    await user.click(await screen.findByRole('button', { name: 'Stop recording' }));
}

describe('ReplyDot review phase', () => {
    it('previews the recording with the shared ListenDot control', async () => {
        const user = userEvent.setup();
        render(<ReplyDot promptId="p1" isEmbed creatorHandle="brad" maxDurationMs={MAX_MS} />);

        await recordSomething(user);

        // Named for what it plays — this is ListenDot, not the hand-rolled
        // "Play preview" button it replaced.
        expect(
            await screen.findByRole('button', { name: 'Play your recording' }),
        ).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Discard recording' })).toBeInTheDocument();
    });

    it('toggles the preview to pause on play', async () => {
        const user = userEvent.setup();
        render(<ReplyDot promptId="p1" isEmbed creatorHandle="brad" maxDurationMs={MAX_MS} />);

        await recordSomething(user);
        await user.click(await screen.findByRole('button', { name: 'Play your recording' }));

        expect(
            await screen.findByRole('button', { name: 'Pause your recording' }),
        ).toBeInTheDocument();
    });

    it('routes a failed preview to the consumer error sink', async () => {
        // Previously `play().catch(console.error)` — a failed preview left the
        // button dead and said nothing anywhere the responder could see.
        vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockRejectedValue(
            new DOMException('blocked', 'NotAllowedError'),
        );
        const onError = vi.fn();
        const user = userEvent.setup();
        render(<ReplyDot promptId="p1" isEmbed creatorHandle="brad" maxDurationMs={MAX_MS} onError={onError} />);

        await recordSomething(user);
        await user.click(await screen.findByRole('button', { name: 'Play your recording' }));

        await waitFor(() =>
            expect(onError).toHaveBeenCalledWith(
                'Your browser blocked playback — tap play again.',
            ),
        );
    });

    it('returns to idle when the recording is discarded', async () => {
        const user = userEvent.setup();
        render(<ReplyDot promptId="p1" isEmbed creatorHandle="brad" maxDurationMs={MAX_MS} />);

        await recordSomething(user);
        await user.click(await screen.findByRole('button', { name: 'Discard recording' }));

        expect(
            await screen.findByRole('button', { name: 'Start recording your reply' }),
        ).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Play your recording' })).not.toBeInTheDocument();
    });
});

/**
 * The two things the `@antiphony/capture-kit` cutover is responsible for
 * keeping true. The kit classifies and exposes primitives; ReplyDot owns what
 * a person sees, and both of these are places where a wiring mistake is
 * invisible to the compiler.
 */
describe('ReplyDot ↔ capture-kit wiring', () => {
    it('opts into the analyser and hands it to HairlineRipple', async () => {
        const user = userEvent.setup();
        render(<ReplyDot promptId="p1" isEmbed creatorHandle="brad" maxDurationMs={MAX_MS} />);

        // Opt-in, because an AudioContext holds the audio hardware awake — so
        // a consumer that wants a reactive dot has to ask. We do.
        expect(recorderOptions).toHaveBeenCalledWith(expect.objectContaining({ analyser: true }));

        // The take's hard stop, forwarded rather than reimplemented. The kit
        // auto-stops at the limit and still yields the blob, so a responder who
        // runs long keeps what they said — which is the whole reason the cap is
        // enforced here and not at the upload.
        expect(recorderOptions).toHaveBeenCalledWith(
            expect.objectContaining({ maxDurationMs: MAX_MS }),
        );

        // The ripple only mounts while a take is rolling.
        await user.click(screen.getByRole('button', { name: 'Start recording your reply' }));

        // And the node reaches it. Without this the dot still renders and still
        // animates — just on its resting heartbeat, deaf to the voice.
        await waitFor(() =>
            expect(rippleProps).toHaveBeenCalledWith(
                expect.objectContaining({ analyser: FAKE_ANALYSER }),
            ),
        );
    });

    it('shows Vox Pop’s copy for a refused microphone and returns to idle', async () => {
        // The regression this exists for: the phase flips to `recording`
        // optimistically, so a rejected getUserMedia used to leave a Stop
        // button for a take that never started — no message, no way back.
        recorderOverride = { status: 'error', errorKind: 'permission-denied', analyser: null };
        render(<ReplyDot promptId="p1" isEmbed creatorHandle="brad" maxDurationMs={MAX_MS} />);

        expect(await screen.findByText(/microphone access was denied/i)).toBeInTheDocument();
        // Back to idle: the record button is offered again, and no Stop button
        // is left standing.
        expect(screen.getByRole('button', { name: 'Start recording your reply' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Stop recording' })).not.toBeInTheDocument();
    });

    it('routes the message to an onError sink instead of the dot when given one', async () => {
        // The embed passes this: the dot is `overflow-hidden`, so a wide
        // message clips inside the small circle and has to render outside it.
        const onError = vi.fn();
        recorderOverride = { status: 'error', errorKind: 'no-device', analyser: null };
        render(<ReplyDot promptId="p1" isEmbed creatorHandle="brad" maxDurationMs={MAX_MS} onError={onError} />);

        await waitFor(() =>
            expect(onError).toHaveBeenCalledWith(expect.stringMatching(/no microphone found/i)),
        );
        expect(screen.queryByText(/no microphone found/i)).not.toBeInTheDocument();
    });
});

describe('ReplyDot embed upload', () => {
    // The anonymous upload refuses a prompt that was archived or taken down
    // after the widget loaded. "Prompt not found" reads like a bug to someone
    // who was just looking at the prompt, so the widget says what it means.
    it('explains a 404 as a prompt that no longer takes replies', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () =>
                new Response(
                    JSON.stringify({ success: false, error: { message: 'Prompt not found', code: 'not_found' }, requestId: 'r1' }),
                    { status: 404, headers: { 'content-type': 'application/json' } },
                ),
            ),
        );
        const onError = vi.fn();
        const user = userEvent.setup();
        render(
            <ReplyDot
                promptId="p1"
                isEmbed
                creatorHandle="brad"
                maxDurationMs={MAX_MS}
                voxPopApiBaseUrl="https://api.example"
                hostAppBaseUrl="https://host.example"
                onError={onError}
            />,
        );

        await recordSomething(user);
        await user.click(await screen.findByRole('button', { name: /^Send reply to/ }));

        await waitFor(() => expect(onError).toHaveBeenCalledWith(PROMPT_CLOSED_MESSAGE));
    });
});
