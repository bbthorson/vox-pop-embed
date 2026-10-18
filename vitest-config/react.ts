import { defineConfig, type ViteUserConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { workspaceAliases } from './aliases';
import { sharedTestDefaults } from './defaults';

/** Always runs first, so a workspace's own setup can override any stub in it. */
const jsdomSetup = path.join(path.dirname(fileURLToPath(import.meta.url)), 'jsdom-setup.ts');

/**
 * Vitest baseline for the workspaces that render React into jsdom — apps/web,
 * apps/public, and the UI/auth packages.
 *
 * See `node.ts` for why the two presets are separate files rather than one
 * preset with a flag.
 *
 * `setupFiles` is prepended with `jsdom-setup.ts` — jest-dom's matchers and
 * the jsdom shims every React workspace needs — rather than replaced, so a
 * workspace lists only its own setup.
 *
 * Aliases go under `resolve.alias`, which is where six of the seven consumers
 * already had them. apps/web was the odd one out, putting them under
 * `test.alias`; both work, but having two spellings meant neither was obviously
 * the convention.
 */
export function reactPreset(overrides: ViteUserConfig = {}): ViteUserConfig {
    const { test: testOverrides, resolve: resolveOverrides, plugins = [], ...rest } = overrides;
    const { setupFiles = [], ...testRest } = testOverrides ?? {};

    return defineConfig({
        ...rest,
        plugins: [react(), ...plugins],
        resolve: {
            ...resolveOverrides,
            alias: { ...workspaceAliases, ...(resolveOverrides?.alias as object) },
        },
        test: {
            ...sharedTestDefaults,
            environment: 'jsdom',
            ...testRest,
            setupFiles: [jsdomSetup, ...(Array.isArray(setupFiles) ? setupFiles : [setupFiles])],
        },
    });
}
