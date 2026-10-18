import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
    lightTokens,
    darkTokens,
    editorialTokens,
    darkEditorialTokens,
} from './dist/tokens.js';

/**
 * Lockstep guard for the two token twins.
 *
 * `tokens.ts` and `tokens.css` hold the same palette in two forms — the CSS for
 * Tailwind to resolve through `hsl(var(--x))`, the TS for the consumers that
 * have no cascade to read (Canvas, the mobile theme generator, OG images). The
 * docblock in tokens.ts has said "keep this file in lockstep, a vitest snapshot
 * would be nice as a guard, but for now the convention is…" since it was
 * written, and the convention did what conventions do: `editorialTokens
 * .inkSubtle` sat at 55% for the entire life of the AA fix that moved the CSS
 * side to 42%.
 *
 * Run with: `npm run test -w @vox-pop/design-tokens`
 * (requires `dist/` — the root `pretest` runs `build:packages` first).
 */

const CSS = readFileSync(fileURLToPath(new URL('./src/tokens.css', import.meta.url)), 'utf8');

/**
 * Parse the stylesheet into `{ selector: { '--var': 'value' } }`.
 *
 * Deliberately simple: the file is flat top-level rules by construction (its
 * own header explains why there's no `@layer base` wrapper), so brace matching
 * is not needed. Comments are stripped first so a commented-out declaration
 * can't register as real.
 */
function parseCss(source) {
    const blocks = {};
    const withoutComments = source.replace(/\/\*[\s\S]*?\*\//g, '');
    const ruleRe = /([^{}]+)\{([^{}]*)\}/g;
    let rule;
    while ((rule = ruleRe.exec(withoutComments)) !== null) {
        const selector = rule[1].trim().replace(/\s+/g, ' ');
        const declarations = {};
        for (const line of rule[2].split(';')) {
            const idx = line.indexOf(':');
            if (idx === -1) continue;
            const name = line.slice(0, idx).trim();
            if (!name.startsWith('--')) continue;
            declarations[name] = line.slice(idx + 1).trim();
        }
        blocks[selector] = declarations;
    }
    return blocks;
}

const css = parseCss(CSS);

/** camelCase TS key -> the `--kebab-case` custom property it mirrors. */
const cssVar = (key) => `--${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;

/**
 * Resolve a variable the way the cascade would for an element carrying the
 * given classes, most specific selector first.
 *
 * This is what lets the TS file legitimately write
 * `destructive: lightTokens.destructive` for the fields `.theme-editorial`
 * doesn't redefine — the expected value is the inherited one, not a duplicate
 * literal, and the test has to model that rather than demand a redefinition.
 */
function resolve(chain, name) {
    for (const selector of chain) {
        const value = css[selector]?.[name];
        if (value !== undefined) return value;
    }
    return undefined;
}

const REGISTERS = [
    ['lightTokens', lightTokens, [':root']],
    ['darkTokens', darkTokens, ['.dark', ':root']],
    ['editorialTokens', editorialTokens, ['.theme-editorial', ':root']],
    [
        'darkEditorialTokens',
        darkEditorialTokens,
        ['.dark .theme-editorial', '.theme-editorial', '.dark', ':root'],
    ],
];

for (const [name, tokens, chain] of REGISTERS) {
    test(`${name} matches tokens.css`, () => {
        for (const [key, expected] of Object.entries(tokens)) {
            const varName = cssVar(key);
            const actual = resolve(chain, varName);
            assert.notEqual(
                actual,
                undefined,
                `${varName} is missing from tokens.css for ${name} (looked in ${chain.join(' → ')})`,
            );
            assert.equal(
                actual,
                expected,
                `${name}.${key} is "${expected}" but tokens.css resolves ${varName} to "${actual}"`,
            );
        }
    });
}

test('every custom property in tokens.css is exported from tokens.ts', () => {
    const exported = new Set(Object.keys(lightTokens).map(cssVar));
    for (const [selector, declarations] of Object.entries(css)) {
        for (const varName of Object.keys(declarations)) {
            assert.ok(
                exported.has(varName),
                `${selector} defines ${varName}, which has no field on TokenSet — add it to tokens.ts so the non-CSS consumers can see it.`,
            );
        }
    }
});
