import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Vite config for apps/embed.
 *
 * Build emits a static SPA to `dist/`, served as an assets-only Cloudflare
 * Worker — no Worker script, no adapter (see `wrangler.jsonc`). No SSR: the browser
 * fetches prompt data from the Vox Pop BFF at runtime over CORS.
 *
 * Note on `shared/*` paths: these used to be type-only imports, erased at
 * compile time, so no runtime alias was needed — and this note used to say
 * "if a value import ever appears, add a `resolve.alias` entry mirroring the
 * tsconfig path". One has: `REPLY_MAX_DURATION_MS` from
 * `shared/types/audio-limits`, the recording cap this app shares with the
 * public page and the phone line. The alias below is that entry.
 *
 * It costs nothing measurable. `types/audio-limits.ts` imports nothing, so
 * Rollup pulls in the two numbers actually referenced and drops the rest of
 * the package — which matters on a bundle whose own application code is 4 kB.
 */
export default defineConfig({
    plugins: [react()],
    resolve: {
        /**
         * Preact, aliased in over React — a ~50 kB gzip saving on a bundle
         * whose own application code is 4 kB.
         *
         * This app is a chrome-less recorder in a 340–480px iframe that a
         * creator's site loads on every page view; React + react-dom was 60 kB
         * gzip of the 127 kB total, for `useState`/`useEffect`/`useRef`/
         * `useCallback` and nothing else (the React 19 surface — Actions,
         * `use()`, RSC — is entirely unused here and in @vox-pop/brand-ui).
         *
         * Scoped to THIS app deliberately. `@vox-pop/brand-ui` keeps its React
         * peer dependency and apps/web + apps/public keep real React; the alias
         * only rewrites what goes into this bundle, so nothing about the shared
         * package changes.
         *
         * `react-dom/client` resolves through `preact/compat` (which re-exports
         * `createRoot`), so main.tsx needs no change.
         */
        alias: {
            // Mirrors tsconfig's `paths` entry, for the value imports under
            // `shared/types/*` — see the note above.
            'shared/': fileURLToPath(new URL('../../packages/shared/', import.meta.url)),
            react: 'preact/compat',
            'react-dom': 'preact/compat',
            'react-dom/client': 'preact/compat/client',
            'react/jsx-runtime': 'preact/jsx-runtime',
            'react/jsx-dev-runtime': 'preact/jsx-dev-runtime',
        },
    },
    server: {
        // Default Vite port — also the origin the BFF must list in
        // ALLOWED_ORIGINS for local dev. Bump here = bump there.
        port: 5173,
    },
    build: {
        // Output to `dist/` — referenced by `assets.directory` in
        // wrangler.jsonc, which `wrangler deploy` uploads as the Worker's
        // static assets.
        outDir: 'dist',
        // Modest bundle target: the embed is intentionally small.
        // Modern evergreen browsers only; we don't ship the embed
        // to IE11 / pre-2022 Safari.
        target: 'es2022',
    },
});
