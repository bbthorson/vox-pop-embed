/**
 * `prefer-vi-stub` — in a test file, change env and globals through vitest.
 *
 * ## The drift this stops
 *
 * Before this rule, ~100 test files set `process.env.X = …` inside hooks and
 * tests and then restored it by hand: save the original, `delete` it in an
 * `afterEach` if it was unset, reassign it otherwise. Nine more did the same
 * with `globalThis.fetch`. Every copy was a chance to forget the restore, and
 * a forgotten one leaks into whichever test the worker runs next — a failure
 * that shows up in a file that did nothing wrong.
 *
 * The shared vitest presets (`vitest-config/defaults.ts`) run
 * `unstubEnvs`/`unstubGlobals` before every test, so `vi.stubEnv` and
 * `vi.stubGlobal` restore themselves. This rule makes them the only way in.
 *
 * ## What it reports
 *
 *   - `process.env.X = …` and `delete process.env.X` **inside any function**
 *     (a test, a hook, a helper). Use `vi.stubEnv('X', value)`; to unset,
 *     `vi.stubEnv('X', undefined)`.
 *   - Assigning a property of `global` / `globalThis` / `window` anywhere.
 *     Use `vi.stubGlobal('fetch', fn)`.
 *   - Replacing `process.env` wholesale (`process.env = { ...saved }`),
 *     anywhere. vitest's stubs write through the env object it captured at
 *     startup; swap the object and every later `vi.stubEnv` lands on the old
 *     one, so the code under test never sees it. Four files did this; converting
 *     the first of them to `vi.stubEnv` is how it surfaced.
 *
 * ## What it deliberately allows
 *
 * `process.env.X = …` at **module scope**. Some modules read env once at
 * import time, so the value has to be in place before the file's
 * `await import(...)` of the module under test — and a module-scope
 * `vi.stubEnv` would be undone before the first test runs. Each test file
 * gets its own module graph and env in vitest's default isolation, so a
 * module-scope assignment cannot leak into another file.
 *
 * Scope it to test files in the config (`files: ["**\/*.test.*"]`); outside
 * tests, assigning `process.env` is a runtime decision, not a test smell.
 */

const GLOBAL_OBJECTS = new Set(["global", "globalThis", "window"]);

/** Unwrap `(globalThis as any)` / `globalThis!` to the underlying expression. */
function unwrap(node) {
    while (
        node &&
        (node.type === "TSAsExpression" ||
            node.type === "TSNonNullExpression" ||
            node.type === "TSTypeAssertion" ||
            node.type === "TSSatisfiesExpression")
    ) {
        node = node.expression;
    }
    return node;
}

/** `process.env` itself. */
function isProcessEnv(node) {
    node = unwrap(node);
    return (
        node?.type === "MemberExpression" &&
        !node.computed &&
        unwrap(node.object)?.type === "Identifier" &&
        unwrap(node.object).name === "process" &&
        node.property.type === "Identifier" &&
        node.property.name === "env"
    );
}

/** `process.env.X` / `process.env['X']` → the member expression, else null. */
function isProcessEnvMember(node) {
    if (node?.type !== "MemberExpression") return false;
    const obj = unwrap(node.object);
    return (
        obj?.type === "MemberExpression" &&
        unwrap(obj.object)?.type === "Identifier" &&
        unwrap(obj.object).name === "process" &&
        !obj.computed &&
        obj.property.type === "Identifier" &&
        obj.property.name === "env"
    );
}

function envName(member) {
    if (!member.computed && member.property.type === "Identifier") return member.property.name;
    if (member.property.type === "Literal") return String(member.property.value);
    return "NAME";
}

function globalMember(node) {
    if (node?.type !== "MemberExpression") return null;
    const obj = unwrap(node.object);
    if (obj?.type !== "Identifier" || !GLOBAL_OBJECTS.has(obj.name)) return null;
    if (!node.computed && node.property.type === "Identifier") return node.property.name;
    if (node.property.type === "Literal") return String(node.property.value);
    return "name";
}

function insideFunction(node) {
    for (let p = node.parent; p; p = p.parent) {
        if (
            p.type === "FunctionDeclaration" ||
            p.type === "FunctionExpression" ||
            p.type === "ArrowFunctionExpression"
        ) {
            return true;
        }
    }
    return false;
}

/** @type {import("eslint").Rule.RuleModule} */
export default {
    meta: {
        type: "problem",
        docs: {
            description:
                "In tests, change env with vi.stubEnv and globals with vi.stubGlobal, so vitest restores them.",
        },
        schema: [],
        messages: {
            envAssign:
                "Use `vi.stubEnv('{{name}}', …)` instead of assigning `process.env.{{name}}` inside a test or hook — " +
                "vitest restores stubbed env before the next test, so the save/restore boilerplate goes too. " +
                "(Module-scope assignment, for a module that reads env at import time, is allowed.)",
            envDelete:
                "Use `vi.stubEnv('{{name}}', undefined)` instead of `delete process.env.{{name}}` inside a test or hook — " +
                "vitest restores stubbed env before the next test.",
            envReplace:
                "Do not replace `process.env` — vitest's `vi.stubEnv` writes through the object it captured at startup, " +
                "so every later stub would miss. Stub the keys you need with `vi.stubEnv`.",
            globalAssign:
                "Use `vi.stubGlobal('{{name}}', …)` instead of assigning a global — " +
                "vitest restores stubbed globals before the next test.",
        },
    },
    create(context) {
        return {
            AssignmentExpression(node) {
                const target = unwrap(node.left);
                if (isProcessEnv(target)) {
                    context.report({ node, messageId: "envReplace" });
                    return;
                }
                if (isProcessEnvMember(target)) {
                    if (insideFunction(node)) {
                        context.report({ node, messageId: "envAssign", data: { name: envName(target) } });
                    }
                    return;
                }
                const g = globalMember(target);
                if (g) context.report({ node, messageId: "globalAssign", data: { name: g } });
            },
            UnaryExpression(node) {
                if (node.operator !== "delete") return;
                const target = unwrap(node.argument);
                if (isProcessEnvMember(target) && insideFunction(node)) {
                    context.report({ node, messageId: "envDelete", data: { name: envName(target) } });
                }
            },
        };
    },
};
