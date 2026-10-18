/**
 * ESLint rule: vox-pop/no-firebase-data-access
 *
 * Keeps the Firebase Admin SDK and its data handles out of the code it is
 * pointed at. Today that is the whole repo: `eslint-config/base.mjs` enables it
 * everywhere, because Firestore and Firebase Auth are gone (app data is in Neon
 * Postgres, blobs in R2) and `firebase-admin` does not run on workerd. It is a
 * regression guard — nothing imports the SDK, and this keeps it that way.
 *
 * It was written when the boundary was narrower — Firebase wiring was allowed
 * in the BFF's outbound adapters but not its inbound REST handlers, and eight
 * route handlers had quietly violated that (Architecture Drift #7, closed
 * 2026-08-06). A convention nobody can grep for decays; a rule doesn't. The
 * options below still let a config police such a partial boundary.
 *
 * FCM web push uses the `firebase/*` client SDK, which this rule does not
 * touch.
 *
 * Two things are flagged:
 *
 *   1. Importing `firebase-admin` or any of its subpaths (`firebase-admin/auth`,
 *      `firebase-admin/firestore`, …).
 *   2. Importing a Firebase *handle accessor* — `getAdminDb`, `getAdminAuth`,
 *      `getAdmin` by default — from the local `lib/firebase-admin` module.
 *
 * Two things are deliberately NOT flagged:
 *
 *   - **Type-only imports.** `import type { … } from 'firebase-admin'` carries
 *     no runtime coupling; banning it would push people toward `any`.
 *   - **Non-handle named imports**, `isUsingEmulator` by default. That's an
 *     environment predicate, not a database handle — a route branching on
 *     "are we in the emulator" is reading config, and no adapter indirection
 *     makes that cleaner.
 *
 * Both allowances are options, so a stricter layer can narrow them:
 *
 *   "vox-pop/no-firebase-data-access": ["error", {
 *       allowedNamedImports: [],        // ban isUsingEmulator too
 *       allowTypeImports: false,
 *   }]
 *
 * The options also let it police a *partial* boundary — ban a single accessor
 * and leave the package imports alone:
 *
 *   "vox-pop/no-firebase-data-access": ["error", {
 *       handleAccessors: ["getAdminAuth"],
 *       allowPackageImports: true,
 *   }]
 */

/** Named imports from `lib/firebase-admin` that hand back a live SDK handle. */
const DEFAULT_HANDLE_ACCESSORS = ["getAdminDb", "getAdminAuth", "getAdmin"];

/** Non-handle exports of `lib/firebase-admin` that are fine anywhere. */
const DEFAULT_ALLOWED_NAMED_IMPORTS = ["isUsingEmulator"];

/** Remediation advice when the config supplies none. */
const DEFAULT_GUIDANCE =
    "`firebase-admin` does not run on workerd and Firebase is no longer a data store here. App data lives in Neon Postgres and blobs in R2 — use those bindings instead.";

/** True for `firebase-admin` and any subpath of it. */
function isFirebaseAdminPackage(source) {
    return source === "firebase-admin" || source.startsWith("firebase-admin/");
}

/**
 * True for the repo's own Firebase bootstrap module, however it's spelled.
 * Matched on the path tail rather than an exact string because the relative
 * prefix varies with nesting depth (`../../../lib/firebase-admin.js` today,
 * something else the moment a route moves into a subdirectory).
 *
 * The `lib/` segment is optional so a *sibling* import, `./firebase-admin.js`,
 * is caught too — that's how a module inside `lib/` itself spells it, and
 * `lib/pending-uploads.ts` and `lib/idempotency.ts` are exactly such modules
 * (see `specs/future/cloudflare-migration.md` § 2, which found them holding
 * Firestore outside the adapter seam). Still anchored at the end, so a
 * lookalike like `./firebase-admin-helpers.js` doesn't match.
 */
function isLocalFirebaseAdminModule(source) {
    return /(^|\/)(lib\/)?firebase-admin(\.js|\.ts)?$/.test(source);
}

/** @type {import("eslint").Rule.RuleModule} */
const rule = {
    meta: {
        type: "problem",
        docs: {
            description:
                "Disallow Firebase Admin SDK imports and handle accessors (getAdminDb / getAdminAuth) — a regression guard now that Firestore and Firebase Auth are gone.",
        },
        messages: {
            firebaseAdminImport: "Don't import `{{source}}` here. {{guidance}}",
            handleAccessor:
                "Don't import `{{name}}` here — it hands back a live Firebase handle. {{guidance}}",
        },
        schema: [
            {
                type: "object",
                properties: {
                    handleAccessors: {
                        type: "array",
                        items: { type: "string" },
                    },
                    allowedNamedImports: {
                        type: "array",
                        items: { type: "string" },
                    },
                    allowTypeImports: { type: "boolean" },
                    allowPackageImports: { type: "boolean" },
                    guidance: { type: "string" },
                },
                additionalProperties: false,
            },
        ],
    },
    create(context) {
        const options = context.options[0] || {};
        const handleAccessors = new Set(
            options.handleAccessors || DEFAULT_HANDLE_ACCESSORS,
        );
        const allowedNamedImports = new Set(
            options.allowedNamedImports || DEFAULT_ALLOWED_NAMED_IMPORTS,
        );
        const allTypeImportsAllowed = options.allowTypeImports !== false;
        const packageImportsAllowed = options.allowPackageImports === true;
        // The "do this instead" half of the message is the config's to supply;
        // the default covers the repo-wide case.
        const guidance = options.guidance || DEFAULT_GUIDANCE;

        return {
            ImportDeclaration(node) {
                // `import type { … }` — no runtime coupling.
                if (allTypeImportsAllowed && node.importKind === "type") return;

                const source = node.source.value;
                if (typeof source !== "string") return;

                if (isFirebaseAdminPackage(source)) {
                    if (packageImportsAllowed) return;

                    // `import { type Auth } from 'firebase-admin/auth'` — the
                    // declaration is a value import but every name it binds is
                    // a type, so nothing lands at runtime. A bare
                    // `import 'firebase-admin'` has no specifiers at all and is
                    // a genuine side-effect import, so it stays reported.
                    const allSpecifiersAreTypes =
                        node.specifiers.length > 0 &&
                        node.specifiers.every((s) => s.importKind === "type");
                    if (allTypeImportsAllowed && allSpecifiersAreTypes) return;

                    context.report({
                        node,
                        messageId: "firebaseAdminImport",
                        data: { source, guidance },
                    });
                    return;
                }

                if (!isLocalFirebaseAdminModule(source)) return;

                for (const specifier of node.specifiers) {
                    // Per-specifier `import { type Foo }` is equally inert.
                    if (allTypeImportsAllowed && specifier.importKind === "type") continue;

                    // A namespace or default import pulls the accessors in
                    // wholesale, so it can't be checked name by name.
                    if (
                        specifier.type === "ImportNamespaceSpecifier" ||
                        specifier.type === "ImportDefaultSpecifier"
                    ) {
                        context.report({
                            node: specifier,
                            messageId: "firebaseAdminImport",
                            data: { source, guidance },
                        });
                        continue;
                    }

                    const name = specifier.imported?.name;
                    if (!name) continue;
                    if (allowedNamedImports.has(name)) continue;
                    if (!handleAccessors.has(name)) continue;

                    context.report({
                        node: specifier,
                        messageId: "handleAccessor",
                        data: { name, guidance },
                    });
                }
            },
        };
    },
};

export default rule;
