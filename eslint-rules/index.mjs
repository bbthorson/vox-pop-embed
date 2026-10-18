/**
 * vox-pop local ESLint plugin.
 *
 * Houses repo-local lint rules that enforce conventions specific to this
 * codebase. Currently:
 *
 *   - `no-success-envelope-extras`: enforces the post-Phase-4 envelope
 *     contract on Hono `c.json(...)` calls — only `data` may accompany
 *     `success: true`. See the rule file for details.
 *   - `require-success-envelope`: the complement — requires inline
 *     `.json({ … })` route responses to BE an envelope (carry a `success`
 *     key) in the first place. Used on apps/web's route handlers.
 *   - `use-create-app-route`: requires BFF route declarations to use
 *     `createAppRoute` over bare `createRoute`, so the error responses a
 *     route's middleware can produce (401/429/500) are documented. The
 *     handler type-check can't see those — see the rule file.
 *   - `no-firebase-data-access`: keeps `firebase-admin` imports and the
 *     `getAdminDb`/`getAdminAuth` handle accessors out of the repo — enabled
 *     repo-wide by `eslint-config/base.mjs` as a regression guard.
 *   - `no-hardcoded-colors`: keeps every color coming from the design
 *     tokens — no stock Tailwind palette, no absolute black/white, no
 *     arbitrary `bg-[hsl(…)]`, no bare hex. See specs/design-system.md § 6.
 *   - `no-arbitrary-font-size`: keeps type on the standard scale rather
 *     than one-off `text-[Npx]` values. Same spec section.
 *   - `prefer-vi-stub`: in test files, env and globals change through
 *     `vi.stubEnv` / `vi.stubGlobal`, which the shared vitest presets undo
 *     before every test — no hand-rolled save/restore. Enabled for every
 *     test file by `eslint-config/base.mjs`.
 *
 * Add new rules by importing them here and registering them in the
 * `rules` map below — the import path stays stable (`../../eslint-rules/`)
 * so consumer configs only update when adding NEW rules to enable.
 */

import noSuccessEnvelopeExtras from "./no-success-envelope-extras.mjs";
import requireSuccessEnvelope from "./require-success-envelope.mjs";
import useCreateAppRoute from "./use-create-app-route.mjs";
import preferHttpsUrl from "./prefer-https-url.mjs";
import noFirebaseDataAccess from "./no-firebase-data-access.mjs";
import noHardcodedColors from "./no-hardcoded-colors.mjs";
import noArbitraryFontSize from "./no-arbitrary-font-size.mjs";
import preferViStub from "./prefer-vi-stub.mjs";

/** @type {import("eslint").ESLint.Plugin} */
const plugin = {
    meta: { name: "vox-pop" },
    rules: {
        "no-success-envelope-extras": noSuccessEnvelopeExtras,
        "require-success-envelope": requireSuccessEnvelope,
        "use-create-app-route": useCreateAppRoute,
        "prefer-https-url": preferHttpsUrl,
        "no-firebase-data-access": noFirebaseDataAccess,
        "no-hardcoded-colors": noHardcodedColors,
        "no-arbitrary-font-size": noArbitraryFontSize,
        "prefer-vi-stub": preferViStub,
    },
};

export default plugin;
