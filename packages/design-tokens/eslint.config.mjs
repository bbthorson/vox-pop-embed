import { baseConfig } from "../../eslint-config/base.mjs";

/**
 * ESLint config for `@vox-pop/design-tokens`.
 *
 * This package is the FLOOR of the dependency graph — CSS variables, TS token
 * constants, and the shared Tailwind preset. Every UI package and app depends
 * on it; it depends on nothing of ours. The one rule worth enforcing at lint
 * time is that it stays that way: an import of any `@vox-pop/*` package or
 * `apps/*` path here would create a cycle through the build (`build:packages`
 * compiles design-tokens FIRST, before ui/brand-ui/shared exist).
 *
 * `tailwindcss` is the only legitimate outside import, and it is type-only.
 */
export default [
    {
        ignores: ["dist/", "node_modules/"],
    },
    ...baseConfig,
    {
        rules: {
            "no-restricted-imports": ["error", {
                patterns: [
                    {
                        group: [
                            "@/*",
                            "../../apps/**", "../apps/**", "**/apps/**",
                            "@vox-pop/*",
                            "@antiphony/*",
                        ],
                        message: "@vox-pop/design-tokens is the bottom of the dependency graph — it must not import from any other workspace package or app. Tokens flow outward only. It is built first by `npm run build:packages`, so such an import would be a build cycle.",
                    },
                ],
            }],
        },
    },
    {
        // The lockstep test runs under `node --test`, not in a browser — it
        // reads tokens.css off disk and diffs it against the compiled TS.
        files: ["*.test.mjs"],
        languageOptions: {
            globals: {
                URL: "readonly",
                console: "readonly",
                process: "readonly",
            },
        },
        // The shared test-file block in eslint-config/base.mjs is for vitest;
        // these are `node --test` on purpose (the package builds first, before
        // anything a vitest config could import), so its vitest rules do not apply.
        rules: {
            "vitest/no-import-node-test": "off",
            "vitest/prefer-importing-vitest-globals": "off",
        },
    },
];
