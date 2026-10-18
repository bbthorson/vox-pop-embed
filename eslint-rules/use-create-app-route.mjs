/**
 * ESLint rule: vox-pop/use-create-app-route
 *
 * Requires BFF route declarations to use `createAppRoute` (from
 * `lib/openapi-route.ts`) rather than `@hono/zod-openapi`'s bare `createRoute`.
 *
 * ── Why ─────────────────────────────────────────────────────────────
 * `@hono/zod-openapi` type-checks a handler's return against the route's
 * declared `responses`, which makes payload drift almost impossible. But it
 * only sees the HANDLER — a 401 from `requireAuth`, a 429 from `rateLimit`, or
 * a 500 from the app-level `onError` short-circuits before the handler runs, so
 * the compiler cannot know they're reachable and won't complain when a route
 * omits them.
 *
 * The 2026-07-28 drift audit measured the result: all 49 annotated operations
 * sat behind `rateLimit()` and 2 declared a 429; 46 of 49 could 500 and didn't
 * say so. `createAppRoute` derives those from the route's own `middleware`
 * array, so the fix holds for routes nobody has written yet — but only if new
 * routes actually use it. Hence this rule: the convention is enforced, not
 * remembered.
 *
 * Fires on:
 *   - `import { createRoute } from '@hono/zod-openapi'` (the import itself, so
 *     it's caught once at the top of the file rather than at every call site).
 *   - Any call to a function named `createRoute`.
 *
 * Both are auto-fixable where the intent is unambiguous: the call sites rename
 * to `createAppRoute`, and the specifier is dropped from the zod-openapi
 * import. The `createAppRoute` import itself is NOT auto-added — the relative
 * depth varies by file, and a wrong path is worse than a clear error.
 *
 * Scope comes from the ESLint config's `files` glob (the BFF's inbound REST
 * adapters), not the rule, so the rule stays generic.
 */

const MESSAGE =
    "Use `createAppRoute` (lib/openapi-route.ts) instead of `createRoute` — it derives the 401/429/500 responses a route's middleware can produce, which the handler type-check cannot see.";

/** @type {import("eslint").Rule.RuleModule} */
const rule = {
    meta: {
        type: "problem",
        docs: {
            description:
                "Require createAppRoute over bare createRoute so middleware-produced error responses are documented",
        },
        fixable: "code",
        schema: [],
        messages: { useCreateAppRoute: MESSAGE },
    },

    create(context) {
        return {
            // `import { createRoute } from '@hono/zod-openapi'`
            ImportDeclaration(node) {
                if (node.source.value !== "@hono/zod-openapi") return;
                const spec = node.specifiers.find(
                    (s) =>
                        s.type === "ImportSpecifier" &&
                        s.imported &&
                        s.imported.name === "createRoute",
                );
                if (!spec) return;

                context.report({
                    node: spec,
                    messageId: "useCreateAppRoute",
                    fix(fixer) {
                        const named = node.specifiers.filter(
                            (s) => s.type === "ImportSpecifier",
                        );
                        // Sole specifier → the whole import goes away.
                        if (named.length === 1 && node.specifiers.length === 1) {
                            return fixer.remove(node);
                        }
                        // Otherwise drop just this specifier, plus its comma.
                        const src = context.sourceCode ?? context.getSourceCode();
                        const after = src.getTokenAfter(spec);
                        if (after && after.value === ",") {
                            return fixer.removeRange([spec.range[0], after.range[1]]);
                        }
                        const before = src.getTokenBefore(spec);
                        if (before && before.value === ",") {
                            return fixer.removeRange([before.range[0], spec.range[1]]);
                        }
                        return fixer.remove(spec);
                    },
                });
            },

            // Any `createRoute({ ... })` call.
            CallExpression(node) {
                if (node.callee.type !== "Identifier") return;
                if (node.callee.name !== "createRoute") return;
                context.report({
                    node: node.callee,
                    messageId: "useCreateAppRoute",
                    fix: (fixer) => fixer.replaceText(node.callee, "createAppRoute"),
                });
            },
        };
    },
};

export default rule;
