import type { ViteUserConfig } from 'vitest/config';
import { sharedExclude } from './aliases';

/**
 * The `test` options every workspace shares, whichever preset it uses.
 *
 * ## Cleanup is the runner's job, not each file's
 *
 * vitest runs these four before every test (`clearModuleMocks` in the runner,
 * called from `onBeforeTryTask`):
 *
 * - `clearMocks`    — call history of every mock, so a count never carries over.
 *                     Implementations are kept: a module-level
 *                     `vi.fn().mockResolvedValue(x)` still resolves `x`.
 * - `restoreMocks`  — every `vi.spyOn` goes back to the original.
 * - `unstubEnvs`    — every `vi.stubEnv` is undone.
 * - `unstubGlobals` — every `vi.stubGlobal` is undone.
 *
 * Before this, each file picked its own mix — some reset, some cleared, some
 * restored by hand with a saved copy of `process.env.X`, some did nothing and
 * leaked into the next test in the worker. The consequence for test code:
 * stub *inside* a test or a `beforeEach`, never at module scope or in
 * `beforeAll` — a module-scope `vi.stubEnv` is undone before the first test
 * runs. File-wide env that a module reads at import time is the one place a
 * plain `process.env.X = …` at the top of the file is still right; the
 * `vox-pop/prefer-vi-stub` lint rule allows exactly that and nothing else.
 *
 * ## `globals: false`
 *
 * Every test file imports what it uses — `import { describe, it, expect, vi }
 * from 'vitest'`. Two workspaces leaned on injected globals and the rest
 * imported, so a reader could not tell from one file what the next expected.
 * Off means a missing import is a ReferenceError on the first run, which is
 * all the enforcement the convention needs.
 *
 * ## `LOG_LEVEL`
 *
 * Every pino logger in the tree (BFF, telephony, bff-client) reads it. Eighty-
 * five test files used to set it to `silent` by hand on their first line.
 */
export const sharedTestDefaults = {
    globals: false,
    exclude: sharedExclude,
    env: { LOG_LEVEL: 'silent' },
    clearMocks: true,
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
} satisfies NonNullable<ViteUserConfig['test']>;
