import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DotString } from './DotString';
import { DotPair } from './DotPair';

/**
 * The brand rules from `specs/design-system.md` § 5, pinned as assertions.
 * The geometry ones matter because a regression here is silent: a `sag` that
 * rounds to zero still renders a perfectly good line, just not the brand.
 */
describe('DotString', () => {
    /** The single `<path>` the component renders. */
    const pathOf = (container: HTMLElement) => container.querySelector('path')!;

    it('sags — the control point sits below the anchors', () => {
        // The whole identity is in this one number. A quadratic bezier whose
        // control point is level with its endpoints IS a straight line, which
        // § 5 calls a generic divider rather than the mark.
        const { container } = render(<DotString width={96} height={36} sag={14} />);
        const d = pathOf(container).getAttribute('d')!;
        // M3,5.4 Q48,19.4 93,5.4 — anchor y, control y, anchor y.
        const [, anchorY, controlY] = d.match(/M3,([\d.]+) Q[\d.]+,([\d.]+)/)!;
        expect(Number(controlY)).toBeGreaterThan(Number(anchorY));
        expect(Number(controlY) - Number(anchorY)).toBe(14);
    });

    it('is symmetric — the control point is centred between the anchors', () => {
        const { container } = render(<DotString width={96} height={36} />);
        expect(pathOf(container).getAttribute('d')).toContain('Q48,');
    });

    it('maps tone to a token, never a literal color', () => {
        // § 6: colors only via hsl(var(--token)). A hex here would pass every
        // visual check in the light register and break the dark one.
        const { container } = render(<DotString tone="accent-warm" />);
        const stroke = pathOf(container).getAttribute('stroke')!;
        expect(stroke).toBe('hsl(var(--accent-warm) / 0.7)');
        expect(stroke).not.toMatch(/#[0-9a-f]{3,8}/i);
    });

    it('draws muted from --rule, the hairline token it replaces', () => {
        const { container } = render(<DotString tone="muted" />);
        expect(pathOf(container).getAttribute('stroke')).toBe('hsl(var(--rule) / 0.55)');
    });

    it('dashes only when awaiting a reply', () => {
        const { container: awaiting } = render(<DotString dashed />);
        expect(pathOf(awaiting).getAttribute('stroke-dasharray')).toBe('1 7');

        const { container: connected } = render(<DotString />);
        expect(pathOf(connected).getAttribute('stroke-dasharray')).toBeNull();
    });

    it('is decorative — hidden from the accessibility tree', () => {
        // It restates what the two dots and their labels already announce.
        const { container } = render(<DotString />);
        expect(container.querySelector('svg')!.getAttribute('aria-hidden')).toBe('true');
    });
});

describe('DotPair connector', () => {
    const dots = { listen: <div>listen</div>, reply: <div>reply</div>, between: <div>meta</div> };

    it('defaults to the plain rule, leaving existing call sites untouched', () => {
        const { container } = render(<DotPair {...dots} />);
        expect(container.querySelector('svg')).toBeNull();
        expect(container.querySelector('.bg-rule\\/60')).not.toBeNull();
    });

    it('renders a string above AND below the between slot', () => {
        // Two copies, not one: the connector brackets the middle content.
        const { container } = render(<DotPair {...dots} connector="string" />);
        expect(container.querySelectorAll('svg')).toHaveLength(2);
        expect(container.querySelector('.bg-rule\\/60')).toBeNull();
    });

    it('passes tone and dashed through to both strings', () => {
        const { container } = render(
            <DotPair {...dots} connector="string" connectorTone="primary" connectorDashed />,
        );
        const paths = [...container.querySelectorAll('path')];
        expect(paths).toHaveLength(2);
        for (const p of paths) {
            expect(p.getAttribute('stroke')).toBe('hsl(var(--primary) / 0.7)');
            expect(p.getAttribute('stroke-dasharray')).toBe('1 7');
        }
    });

    it('renders no connector at all without a between slot', () => {
        const { container } = render(<DotPair listen={dots.listen} reply={dots.reply} connector="string" />);
        expect(container.querySelector('svg')).toBeNull();
    });
});
