import { baseConfig } from "../../eslint-config/base.mjs";
import voxPop from "../../eslint-rules/index.mjs";

/**
 * ESLint config for `@vox-pop/brand-ui`.
 *
 * The package is FRAMEWORK-PORTABLE — it's consumed by both apps/web
 * (Next.js) and the future apps/embed (Vite). This config enforces the
 * portability invariants at lint time:
 *
 *   - No Next.js imports (`next`, `next/*`). Apps/web passes Next.js
 *     primitives like `Link` as PROPS via the `LinkComponent` port
 *     instead of having the component import them directly.
 *   - No Firebase imports (`firebase`, `firebase/*`, `firebase-admin*`).
 *     Auth state + storage upload arrive via the `AuthProvider` and
 *     `AudioUploader` ports.
 *   - No apps/* or `@/*` path imports — brand-ui is upstream of every
 *     app and can't reach back.
 *
 * Anything the package legitimately needs goes in `package.json` as a
 * real dep (`framer-motion`, `lucide-react`, `clsx`, `tailwind-merge`,
 * `@vox-pop/design-tokens`) or arrives as a prop.
 */
export default [
    {
        ignores: ["dist/", "node_modules/"],
    },
    ...baseConfig,
    {
        languageOptions: {
            // Component-only package — no Node globals. Browser only.
            globals: {
                window: "readonly",
                document: "readonly",
                navigator: "readonly",
                HTMLElement: "readonly",
                HTMLAudioElement: "readonly",
                HTMLCanvasElement: "readonly",
                HTMLInputElement: "readonly",
                HTMLButtonElement: "readonly",
                HTMLDivElement: "readonly",
                MediaRecorder: "readonly",
                MediaStream: "readonly",
                AudioContext: "readonly",
                AnalyserNode: "readonly",
                Blob: "readonly",
                File: "readonly",
                FormData: "readonly",
                URL: "readonly",
                ResizeObserver: "readonly",
                fetch: "readonly",
                console: "readonly",
                setTimeout: "readonly",
                clearTimeout: "readonly",
                setInterval: "readonly",
                clearInterval: "readonly",
                requestAnimationFrame: "readonly",
                cancelAnimationFrame: "readonly",
                Audio: "readonly",
                Image: "readonly",
                Event: "readonly",
                getComputedStyle: "readonly",
                AbortController: "readonly",
                AbortSignal: "readonly",
            },
        },
        rules: {
            "no-restricted-imports": [
                "error",
                {
                    patterns: [
                        {
                            group: [
                                "next",
                                "next/*",
                                "firebase",
                                "firebase/*",
                                "firebase-admin",
                                "firebase-admin/*",
                                "@/*",
                                "apps/*",
                                "../../apps/**",
                                "../../../apps/**",
                            ],
                            message:
                                "brand-ui must be framework-portable. Next.js, Firebase, and apps/* paths are forbidden. Use the ports (AuthProvider / AudioUploader / DotsAuthGate / LinkComponent) to inject app-specific concerns as props.",
                        },
                    ],
                },
            ],
        },
    },
    // Design-token discipline (specs/design-system.md § 6). This package is
    // register-agnostic on purpose — DotMark/ListenDot/HairlineRipple read
    // whatever `--primary`/`--surface-raised` is in scope — which makes
    // hardcoding a color here worse than elsewhere: it would pin one register's
    // value into a component both registers render. See the apps/web config for
    // the token gaps these waited on.
    {
        files: ["src/**/*.{ts,tsx}"],
        // Tests name class strings as fixtures; exempt them.
        ignores: ["src/**/*.test.{ts,tsx}"],
        plugins: { "vox-pop": voxPop },
        rules: {
            "vox-pop/no-hardcoded-colors": "error",
            "vox-pop/no-arbitrary-font-size": "error",
        },
    },
];
