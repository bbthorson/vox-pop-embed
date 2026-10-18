/**
 * Runtime config sourced from Vite build-time env vars.
 *
 * Set in `apps/embed/.env.*` for local dev and in `.env.production` for prod.
 * All `VITE_*` variables are inlined into the bundle at build time — this app
 * is static assets on Cloudflare Pages with no Worker, so there is no runtime
 * environment to read from.
 */

const env = import.meta.env;

/**
 * Strip a single trailing slash so concatenation with paths that
 * start with `/` doesn't produce `//`. Operators sometimes set env
 * vars with trailing slashes; cheaper to normalize once than to
 * thread the convention through every callsite.
 */
function stripTrailingSlash(url: string): string {
    return url.replace(/\/$/, '');
}

/**
 * Origin of the Vox Pop BFF — the embed's ONLY backend (Stream 4 F7 B).
 *
 * Anonymous calls: the public prompt read (`GET /api/v1/prompts/:postId` +
 * `GET /api/v1/users/:handle`) and the pending audio upload
 * (`POST /api/v1/audio/upload-pending`). The BFF's CORS allowlist carries the
 * embed origins. All three are in the public API reference
 * (`apps/vox-pop-api/openapi.public.json`), and
 * `apps/vox-pop-api/src/embed-public-surface.test.ts` fails if this app names
 * a path that is not.
 */
export const VOXPOP_API_BASE_URL: string = stripTrailingSlash(
    env.VITE_VOXPOP_API_BASE_URL ?? 'http://localhost:8091',
);

/**
 * Origin of apps/public (the public capture app) — where the embed
 * redirects the top frame after an anonymous upload, so OTP + reply
 * submission complete on the prompt page (`/@handle/promptId`). See
 * `ReplyDot`'s `submitPendingEmbed`.
 */
export const HOST_APP_BASE_URL: string = stripTrailingSlash(
    env.VITE_HOST_APP_BASE_URL ?? 'http://localhost:9002',
);
