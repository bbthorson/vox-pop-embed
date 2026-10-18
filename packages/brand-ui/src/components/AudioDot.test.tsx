import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AudioDot } from './AudioDot';

describe('AudioDot', () => {
    const AUDIO = 'https://example.test/clip.webm';

    it('renders the player when there is audio', () => {
        render(<AudioDot audioUrl={AUDIO} />);
        expect(screen.getByRole('button', { name: 'Play prompt audio' })).toBeInTheDocument();
    });

    it('renders the fallback in the same circle when there is none', () => {
        // The reason ListenDot can't own its own DotMark: a text-only prompt
        // still gets a dot, it just has no player in it.
        render(<AudioDot audioUrl={null} fallback={<span>Text-only prompt</span>} />);

        expect(screen.getByText('Text-only prompt')).toBeInTheDocument();
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('renders a playback failure outside the clipped circle', async () => {
        vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockRejectedValue(
            new DOMException('blocked', 'NotAllowedError'),
        );
        const user = userEvent.setup();
        const { container } = render(<AudioDot audioUrl={AUDIO} />);

        await user.click(screen.getByRole('button', { name: 'Play prompt audio' }));

        const notice = await screen.findByRole('status');
        expect(notice).toHaveTextContent('Your browser blocked playback');
        // DotMark is `overflow-hidden`, so a notice nested inside it is
        // invisible. Assert it's a sibling of the circle, not a descendant.
        const dot = container.querySelector('.overflow-hidden');
        expect(dot).not.toBeNull();
        expect(dot!.contains(notice)).toBe(false);
    });
});
