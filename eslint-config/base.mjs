import js from "@eslint/js";
import tseslint from "typescript-eslint";
import vitest from "@vitest/eslint-plugin";
import voxPop from "../eslint-rules/index.mjs";

/**
 * The shared ESLint baseline every workspace in this monorepo starts from.
 *
 * ## Why this exists
 *
 * All thirteen workspace configs opened with the same four lines — an `ignores`
 * block, `js.configs.recommended`, `tseslint.configs.recommended`, and a
 * `no-explicit-any` / `no-unused-vars` pair — and then drifted. Six workspaces
 * pinned a different `eslint` range than the other seven; `no-unused-vars` was
 * a bare `"warn"` in two packages and a three-option object in a third, so the
 * same `catch (_err)` was clean in one package and flagged in its neighbour.
 * None of that was a decision anyone made.
 *
 * What is genuinely per-package — the `no-restricted-imports` boundary each one
 * defends — stays in that package's config, where the rationale lives next to
 * the rule. This file is only the floor.
 *
 * ## The two repo-wide vox-pop rules
 *
 * `prefer-https-url` and `no-firebase-data-access` are here rather than opted
 * into per workspace, because both encode invariants CLAUDE.md states about the
 * *repository*, not about one layer:
 *
 *   - **`no-firebase-data-access`** was enabled in **zero** configs before this
 *     file existed, despite `firebase-admin` being documented as banned and
 *     unable to run on workerd at all. The rule and its tests were written and
 *     then never wired to anything. Repo-wide is what the documented ban
 *     actually means, and it costs nothing today: no source file imports
 *     `firebase-admin`. Note it does NOT touch the `firebase/*` client SDK —
 *     FCM's `firebase/app` + `firebase/messaging` are untouched, which is why
 *     this can be a floor rather than a per-package opt-in.
 *
 *   - **`prefer-https-url`** ran only in `packages/shared`, so the bare
 *     `z.string().url()` it exists to forbid — it accepts `javascript:` and
 *     `data:` — was unpoliced in every app.
 *
 * A rule that is enabled nowhere is documentation, not enforcement.
 *
 * ## Test files
 *
 * Every vitest file in every workspace gets the same lint block, for the same
 * reason the floor above exists: before it, nothing said how a test should be
 * written, so each workspace grew its own answer. The conventions it enforces
 * are written up in specs/testing-strategy.md § Writing a test.
 */

/** Build artefacts and vendored trees no workspace should lint. */
export const sharedIgnores = [
    "dist/",
    "node_modules/",
    ".next/",
    ".open-next/",
    "coverage/",
];

/**
 * `_`-prefixed bindings are the repo's existing convention for "deliberately
 * unused" — `catch (_err)` and destructured-and-dropped props both appear in
 * the tree. Spelled out here once so every workspace agrees on it.
 */
export const unusedVarsOptions = {
    argsIgnorePattern: "^_",
    varsIgnorePattern: "^_",
    caughtErrorsIgnorePattern: "^_",
};

/**
 * vitest files. `.mjs` because apps/mobile's theme-generator test is plain ESM.
 *
 * Two trees are `node --test`, not vitest — `eslint-rules/` (no workspace
 * config lints it) and `packages/design-tokens`, whose config turns this
 * block's vitest rules back off for its own tests.
 */
export const testFiles = ["**/*.test.{ts,tsx,mts,mjs}"];

const testConfig = {
    files: testFiles,
    plugins: { vitest, "vox-pop": voxPop },
    rules: {
        // The presets run with `globals: false`; this says why at lint time
        // instead of as a ReferenceError at run time.
        "vitest/prefer-importing-vitest-globals": "error",
        // `it`, never `test` — the whole tree already agrees.
        "vitest/consistent-test-it": ["error", { fn: "it", withinDescribe: "it" }],
        // A committed `.only` silently skips the rest of the file in CI.
        "vitest/no-focused-tests": "error",
        // A skip is sometimes right, but it should be visible every lint run.
        "vitest/no-disabled-tests": "warn",
        "vitest/no-identical-title": "error",
        "vitest/no-import-node-test": "error",
        "vitest/no-standalone-expect": "error",
        "vitest/valid-describe-callback": "error",
        // `maxArgs: 2`: vitest takes a failure message as `expect(value, message)`.
        "vitest/valid-expect": ["error", { maxArgs: 2 }],
        // env and globals change through vi.stubEnv / vi.stubGlobal, which the
        // presets undo before every test. See the rule's header.
        "vox-pop/prefer-vi-stub": "error",
        // `as never` type-checks against anything, so a fixture cast with it can
        // drift from the shape it stands in for and nothing says so. Build the
        // value instead (apps/vox-pop-api has typed factories in src/testing/).
        // A warning, not an error: the other workspaces still have some, and
        // the few that are the point of a test keep a comment saying why.
        "no-restricted-syntax": ["warn", {
            selector: "TSAsExpression > TSNeverKeyword.typeAnnotation",
            message:
                "Avoid `as never` in tests: build a typed fixture instead (see specs/testing-strategy.md § Writing a test). " +
                "If the cast is the point of the test, disable this line with a reason.",
        }],
    },
};

/**
 * The baseline. Spread it first, then add the workspace's own boundary rules:
 *
 *   import { baseConfig } from "../../eslint-config/base.mjs";
 *   export default [
 *       ...baseConfig,
 *       { rules: { "no-restricted-imports": [...] } },
 *   ];
 */
export const baseConfig = [
    { ignores: sharedIgnores },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        plugins: { "vox-pop": voxPop },
        rules: {
            "vox-pop/prefer-https-url": "error",
            // Repo-wide the answer is not "move it" but "there is nowhere to
            // move it to" — firebase-admin does not run on workerd at all.
            "vox-pop/no-firebase-data-access": ["error", {
                guidance:
                    "`firebase-admin` is banned repo-wide: it does not run on workerd, " +
                    "and every deployable here is a Cloudflare Worker. App data lives in " +
                    "Neon Postgres and blobs in R2 — reach for those bindings instead.",
            }],
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/no-unused-vars": ["warn", unusedVarsOptions],
        },
    },
    testConfig,
];

export default baseConfig;
