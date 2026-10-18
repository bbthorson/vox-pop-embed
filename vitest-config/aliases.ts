import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { configDefaults } from 'vitest/config';

/**
 * One definition of where each workspace lives, for every vitest config.
 *
 * Before this file, seven configs each hand-rolled the same map and disagreed
 * about how to spell it: `new URL('../shared', import.meta.url).pathname` in
 * some, `path.resolve(__dirname, '../shared')` in others, with the depth baked
 * into each (`../ui/src` from a package, `../../packages/ui/src` from an app).
 * Every one of those breaks differently if a workspace moves. Anchoring on the
 * repo root instead means the map is written once and is correct from anywhere.
 *
 * Note the two granularities, which are deliberate and not an oversight:
 * `@vox-pop/ui` and `@vox-pop/brand-ui` resolve to their `src/` because those
 * packages publish from `src`, while the rest resolve to the package root.
 */
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const workspaceAliases: Record<string, string> = {
    // `shared` (bare) and `@vox-pop/shared` are the same package under two
    // names — both spellings appear across the tree, so both must resolve.
    shared: path.join(repoRoot, 'packages/shared'),
    '@vox-pop/shared': path.join(repoRoot, 'packages/shared'),
    '@vox-pop/ui': path.join(repoRoot, 'packages/ui/src'),
    '@vox-pop/brand-ui': path.join(repoRoot, 'packages/brand-ui/src'),
    '@vox-pop/bff-client': path.join(repoRoot, 'packages/bff-client'),
    '@vox-pop/web-auth': path.join(repoRoot, 'packages/web-auth'),
    '@vox-pop/hosted': path.join(repoRoot, 'packages/hosted'),
    '@vox-pop/design-tokens': path.join(repoRoot, 'packages/design-tokens/src'),
};

/**
 * Build output and vendored trees, excluded everywhere.
 *
 * Built on `configDefaults.exclude` rather than replacing it: two configs
 * previously wrote a bare `['node_modules/**', 'dist/**']`, which silently
 * dropped vitest's own defaults (`.idea`, `.git`, `.cache`, …) because
 * `exclude` overwrites rather than appends.
 */
export const sharedExclude: string[] = [...configDefaults.exclude, '**/dist/**'];
