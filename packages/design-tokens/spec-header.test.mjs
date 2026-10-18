import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { lightTokens } from './dist/tokens.js';

/**
 * Keeps the YAML header of `specs/design-system.md` honest.
 *
 * That block is the first thing a reader (or an agent) takes the palette from,
 * and it said `primary: "12 86% 55%"` for weeks after the AA fix moved the token
 * to 44% — the same drift the lockstep test next to this one exists for, one
 * file further out. Every color the header names must equal `lightTokens`.
 *
 * Run with: `npm run test -w @vox-pop/design-tokens` (requires `dist/`).
 */

const SPEC = readFileSync(
    fileURLToPath(new URL('../../specs/design-system.md', import.meta.url)),
    'utf8',
);

function headerColors(source) {
    const block = source.match(/```yaml\n([\s\S]*?)```/);
    assert.ok(block, 'specs/design-system.md has no ```yaml header block');
    const colors = block[1].match(/^colors:\n((?: {2}.*\n)+)/m);
    assert.ok(colors, 'the YAML header has no `colors:` map');
    return Object.fromEntries(
        [...colors[1].matchAll(/^ {2}(\w+): "([^"]+)"/gm)].map((m) => [m[1], m[2]]),
    );
}

test('every color in the design-system spec header matches lightTokens', () => {
    const colors = headerColors(SPEC);
    assert.ok(Object.keys(colors).length > 0, 'parsed no colors from the header');
    for (const [name, value] of Object.entries(colors)) {
        assert.ok(name in lightTokens, `header names "${name}", which lightTokens does not define`);
        assert.equal(value, lightTokens[name], `specs/design-system.md header: ${name}`);
    }
});
