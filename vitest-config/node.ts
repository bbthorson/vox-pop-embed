import { defineConfig, type ViteUserConfig } from 'vitest/config';
import { workspaceAliases } from './aliases';
import { sharedTestDefaults } from './defaults';

/**
 * Vitest baseline for the Node/Worker-side workspaces — the Hono BFF, the
 * telephony worker, and the framework-free packages.
 *
 * Kept separate from `react.ts` rather than switched on an option, because that
 * file imports `@vitejs/plugin-react` at module scope. A single shared preset
 * would drag that import into workspaces that do not depend on it (and should
 * not have to).
 *
 * Everything here was already true of every consumer; only the spelling varied.
 * Pass `overrides` for what is genuinely local — an app's `setupFiles`, an
 * `include` narrowed to `src/`.
 */
export function nodePreset(overrides: ViteUserConfig = {}): ViteUserConfig {
    const { test: testOverrides, resolve: resolveOverrides, ...rest } = overrides;

    return defineConfig({
        ...rest,
        resolve: {
            ...resolveOverrides,
            alias: { ...workspaceAliases, ...(resolveOverrides?.alias as object) },
        },
        test: {
            ...sharedTestDefaults,
            environment: 'node',
            ...testOverrides,
        },
    });
}
