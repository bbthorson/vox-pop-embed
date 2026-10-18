import globals from 'globals';
import tseslint from 'typescript-eslint';
import { baseConfig } from '../../eslint-config/base.mjs';
import reactHooks from 'eslint-plugin-react-hooks';

/**
 * ESLint 9 flat config for apps/embed — the standalone Vite + React SPA that
 * serves the chrome-less recorder iframe (embed.voxpop.audio). Deliberately
 * lighter than apps/public's Next config: no `next/core-web-vitals` (this is a
 * static Vite bundle, not a Next app) and no firebase-admin purity guard (the
 * embed is anonymous and has no data layer or auth SDK to guard). Just the JS +
 * TypeScript recommended sets plus the rules-of-hooks checks.
 *
 * Recommended sets are spread in as top-level entries (same style as
 * apps/public). Use react-hooks' `recommended-latest` — it's the flat-config
 * entry (`plugins` is an object); the plain `recommended` export is still the
 * legacy eslintrc shape (`plugins` as a string array) and crashes flat config.
 */
export default tseslint.config(
    { ignores: ['dist/', 'node_modules/'] },
    ...baseConfig,
    reactHooks.configs['recommended-latest'],
    {
        // The shipped web component. It is plain browser JS served as-is (not
        // bundled through src/), so it needs browser globals rather than the
        // TS-aware setup below. Its `catch { }` blocks are deliberate — the
        // widget must never throw into a host page just because it could not
        // work out its own origin — so empty catches are allowed here.
        files: ['public/**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            globals: globals.browser,
        },
        rules: {
            'no-empty': ['error', { allowEmptyCatch: true }],
        },
    },
    {
        // Build-tool config in CommonJS.
        files: ['**/*.cjs'],
        languageOptions: {
            sourceType: 'commonjs',
            globals: globals.node,
        },
    },
    {
        // Build-time scripts, which run under Node rather than in the browser.
        // `scripts/emit-version.mjs` writes `dist/version.json` after `vite
        // build` so the deploy can assert which commit is being served, and it
        // reads `process.env` and logs to `console` — both undefined under the
        // browser globals every other non-`.cjs` file here gets. Without this
        // entry the default `globals.browser` applies and lint fails with
        // `'process' is not defined`, which is exactly how it failed the first
        // time.
        files: ['scripts/**/*.mjs'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: globals.node,
        },
    },
    {
        files: ['src/**/*.{ts,tsx}'],
        languageOptions: {
            ecmaVersion: 2022,
            globals: globals.browser,
        },
    },
);
