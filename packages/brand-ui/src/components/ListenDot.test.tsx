import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ListenDot } from './ListenDot';

/**
 * `ListenDot` is the single playback component for the whole product — the
 * creator's reply panel, the public prompt page, the embed, and (since the
 * convergence pass) the responder's own review preview. These cover the parts
 * that were previously untestable because the package had no runner: the
 * accessible name, and the `play()` rejection path that used to leave a dead
 * button behind a console-only error.
 */
describe('ListenDot', () => {
    const AUDIO = 'https://example.test/clip.webm';

    it('names the control after the subject it plays', () => {
        render(<ListenDot audioUrl={AUDIO} subject="your recording" />);
        expect(screen.getByRole('button', { name: 'Play your recording' })).toBeInTheDocument();
    });

    it('defaults the subject to the creator prompt', () => {
        render(<ListenDot audioUrl={AUDIO} />);
        expect(screen.getByRole('button', { name: 'Play prompt audio' })).toBeInTheDocument();
    });

    it('flips to pause once playback starts', async () => {
        const user = userEvent.setup();
        render(<ListenDot audioUrl={AUDIO} />);

        await user.click(screen.getByRole('button', { name: 'Play prompt audio' }));

        expect(await screen.findByRole('button', { name: 'Pause prompt audio' })).toBeInTheDocument();
    });

    it('surfaces a blocked play as a retryable message instead of a dead button', async () => {
        vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockRejectedValue(
            new DOMException('blocked', 'NotAllowedError'),
        );
        const user = userEvent.setup();
        render(<ListenDot audioUrl={AUDIO} />);

        await user.click(screen.getByRole('button', { name: 'Play prompt audio' }));

        expect(await screen.findByRole('status')).toHaveTextContent(
            'Your browser blocked playback',
        );
        // The control stays actionable and says so — the regression this
        // guards is the button going inert after a rejected play.
        expect(
            screen.getByRole('button', { name: 'Retry playing prompt audio' }),
        ).toBeInTheDocument();
    });

    it('stays silent when a play is merely superseded (AbortError)', async () => {
        vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockRejectedValue(
            new DOMException('superseded', 'AbortError'),
        );
        const user = userEvent.setup();
        render(<ListenDot audioUrl={AUDIO} />);

        await user.click(screen.getByRole('button', { name: 'Play prompt audio' }));

        await waitFor(() =>
            expect(screen.getByRole('button', { name: 'Play prompt audio' })).toBeInTheDocument(),
        );
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('hands failures to an onError sink instead of rendering them, when given one', async () => {
        vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockRejectedValue(
            new DOMException('nope', 'NotSupportedError'),
        );
        const onError = vi.fn();
        const user = userEvent.setup();
        render(<ListenDot audioUrl={AUDIO} onError={onError} />);

        await user.click(screen.getByRole('button', { name: 'Play prompt audio' }));

        await waitFor(() =>
            expect(onError).toHaveBeenCalledWith("This audio can't be played in this browser."),
        );
        // Suppressed in-dot: consumers wrap us in DotMark, which is
        // `overflow-hidden` and clips a notice positioned below the dot.
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
});
