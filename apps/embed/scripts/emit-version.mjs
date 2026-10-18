import { writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Writes `dist/version.json` after `vite build`.
 *
 * ## Why embed gets a FILE where the other two get a route
 *
 * apps/web and apps/public both have a `main` in their `wrangler.jsonc` — a
 * real Worker — so each can answer `/api/version` dynamically from a
 * deploy-time `--var`, which also proves the Worker boots.
 *
 * `apps/embed/wrangler.jsonc` has NO `main`. It is an assets-only Worker: there
 * is no code, no server entry, and nothing to pass a `--var` to. So there is
 * nothing to wake, and "did the Worker boot" is not a question that exists
 * here. What IS worth asserting is that the asset bundle now being served was
 * built from the commit we deployed, and that requires baking the value in at
 * BUILD time. Hence this script rather than a route.
 *
 * ## ⚠️ THE ASSERTION MUST READ THE CONTENT, NOT THE STATUS CODE
 *
 * `wrangler.jsonc` sets `not_found_handling: "single-page-application"`, so
 * every unknown path returns `index.html` with **200**. Verified against
 * production before this file existed: `GET /version.json` already answered
 * 200 with the SPA's HTML. A `curl -f` check would therefore have passed
 * whether or not this file shipped — the deploy step parses the `sha` out of
 * the body for exactly that reason.
 *
 * ## Where the values come from
 *
 * `COMMIT_SHA` and `BUILD_TIME` in the build environment, set by
 * `deploy-workers.yml`. Absent (a local `npm run build`), it writes `dev` and a
 * null timestamp — which the deploy verification treats as a failure, so a
 * build that somehow shipped without the stamp is caught rather than assumed.
 *
 * Written into `dist/` rather than `public/` on purpose: `public/` is source
 * that Vite copies, so generating into it would leave an untracked file in the
 * working tree and risk it being committed. `dist/` is already gitignored and
 * is what wrangler uploads.
 */

const here = dirname(fileURLToPath(import.meta.url));
const dist = resolve(here, '..', 'dist');

const version = {
    ok: true,
    sha: process.env.COMMIT_SHA ?? 'dev',
    deployedAt: process.env.BUILD_TIME ?? null,
};

const target = join(dist, 'version.json');
writeFileSync(target, `${JSON.stringify(version)}\n`, 'utf8');
console.log(`[emit-version] ${target} -> sha=${version.sha} deployedAt=${version.deployedAt}`);
