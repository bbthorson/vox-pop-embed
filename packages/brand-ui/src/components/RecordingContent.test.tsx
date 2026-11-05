import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RecordingContent } from './RecordingContent';

/**
 * Stand in for `@antiphony/capture-kit`'s recorder — jsdom has no
 * MediaRecorder and no microphone. Same shape as ReplyDot's mock: a state
 * machine, where `stop()` moves `status` to `recorded` and publishes a
 * `Recording`. `recordingOverride` swaps in the take a test wants (an
 * interrupted one); `recorderOverride` drives the hook into another state.
 * Both reset in `beforeEach` — a module mock outlives the test that set it.
 */
const RECORDING = {
    blob: new Blob(['audio'], { type: 'audio/webm' }),
    mimeType: 'audio/webm',
    durationMs: 1200,
    previewUrl: 'blob:mock-recording',
    interruption: null as string | null,
};
let recordingOverride: Partial<typeof RECORDING> | null = null;
let recorderOverride: Record<string, unknown> | null = null;

vi.mock('@antiphony/capture-kit', () => ({
    useAudioRecorder: () => {
        const [status, setStatus] = React.useState<'idle' | 'recording' | 'recorded'>('idle');
        return {
            status,
            recording: status === 'recorded' ? { ...RECORDING, ...recordingOverride } : null,
            error: null,
            errorKind: null,
            elapsedMs: 0,
            analyser: null,
            start: () => setStatus('recording'),
            stop: () => setStatus('recorded'),
            reset: () => setStatus('idle'),
            ...recorderOverride,
        };
    },
}));

vi.mock('./HairlineRipple', () => ({ HairlineRipple: () => null }));

beforeEach(() => {
    recordingOverride = null;
    recorderOverride = null;
});

function renderRecorder(props: Partial<React.ComponentProps<typeof RecordingContent>> = {}) {
    const handlers = {
        onRecordingComplete: vi.fn(),
        onDiscard: vi.fn(),
        onPermissionError: vi.fn(),
        onNotice: vi.fn(),
    };
    render(<RecordingContent hasRecording={false} maxDurationMs={90_000} {...handlers} {...props} />);
    return handlers;
}

async function recordSomething(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('button', { name: 'Start recording' }));
    await user.click(await screen.findByRole('button', { name: 'Stop recording' }));
}

describe('RecordingContent interruption notices', () => {
    it('hands over an interrupted take and tells the consumer why it stopped', async () => {
        const user = userEvent.setup();
        recordingOverride = { interruption: 'device-lost' };
        const { onRecordingComplete, onNotice, onPermissionError } = renderRecorder();

        await recordSomething(user);

        // The audio up to the interruption is kept — it is still a take.
        await waitFor(() => expect(onRecordingComplete).toHaveBeenCalledWith(RECORDING.blob));
        expect(onNotice).toHaveBeenCalledWith(expect.stringMatching(/microphone disconnected/i));
        // Not a denial, so it never reaches the "Microphone Access Denied" sink.
        expect(onPermissionError).not.toHaveBeenCalled();
    });

    it('clears the notice when the next take starts', async () => {
        const user = userEvent.setup();
        recordingOverride = { interruption: 'muted' };
        const { onNotice } = renderRecorder();

        await recordSomething(user);
        await user.click(await screen.findByRole('button', { name: /discard/i }));

        expect(onNotice).toHaveBeenLastCalledWith(null);
    });

    it('sends no notice for a take the person stopped themselves', async () => {
        const user = userEvent.setup();
        const { onRecordingComplete, onNotice } = renderRecorder();

        await recordSomething(user);

        await waitFor(() => expect(onRecordingComplete).toHaveBeenCalled());
        expect(onNotice).not.toHaveBeenCalledWith(expect.any(String));
    });

    it('routes an interruption with no audio to the notice, not the permission sink', async () => {
        recorderOverride = { status: 'error', errorKind: 'interrupted' };
        const { onNotice, onPermissionError } = renderRecorder();

        await waitFor(() =>
            expect(onNotice).toHaveBeenCalledWith(expect.stringMatching(/keep this screen open/i)),
        );
        expect(onPermissionError).not.toHaveBeenCalled();
    });

    it('still reports a refused microphone through onPermissionError', async () => {
        recorderOverride = { status: 'error', errorKind: 'permission-denied' };
        const { onNotice, onPermissionError } = renderRecorder();

        await waitFor(() =>
            expect(onPermissionError).toHaveBeenCalledWith(expect.stringMatching(/denied/i)),
        );
        expect(onNotice).not.toHaveBeenCalledWith(expect.any(String));
    });
});
