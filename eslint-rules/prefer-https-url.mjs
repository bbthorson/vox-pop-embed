/**
 * ESLint rule: vox-pop/prefer-https-url
 *
 * Prevents stored XSS and SSRF vulnerabilities caused by bare `z.string().url()`
 * in Zod schemas. Bare `.url()` accepts dangerous schemes like `javascript:`,
 * `data:`, and `file:`.
 *
 * Require using `httpsUrl()` from `@vox-pop/shared` or explicit scheme validation.
 */

function isZodStringChain(node) {
    if (!node) return false;
    if (node.type === "CallExpression") {
        return isZodStringChain(node.callee);
    }
    if (node.type === "MemberExpression") {
        if (
            node.property.type === "Identifier" &&
            node.property.name === "string" &&
            node.object.type === "Identifier" &&
            node.object.name === "z"
        ) {
            return true;
        }
        return isZodStringChain(node.object);
    }
    return false;
}

function isInsideHttpsUrlFunction(node) {
    let current = node;
    while (current) {
        if (
            current.type === "FunctionDeclaration" ||
            current.type === "FunctionExpression" ||
            current.type === "ArrowFunctionExpression"
        ) {
            if (current.id && current.id.name === "httpsUrl") {
                return true;
            }
            if (
                current.parent &&
                current.parent.type === "VariableDeclarator" &&
                current.parent.id &&
                current.parent.id.type === "Identifier" &&
                current.parent.id.name === "httpsUrl"
            ) {
                return true;
            }
        }
        current = current.parent;
    }
    return false;
}

/** @type {import("eslint").Rule.RuleModule} */
const rule = {
    meta: {
        type: "problem",
        docs: {
            description:
                "Enforce scheme sanitization on Zod URL schemas (prevent bare `z.string().url()`). Use `httpsUrl()` from `@vox-pop/shared` instead.",
        },
        messages: {
            bareUrl:
                "Avoid bare `z.string().url()` because it accepts dangerous schemes like `javascript:` and `data:` (XSS/SSRF risk). Use `httpsUrl()` from `@vox-pop/shared` instead.",
        },
        schema: [],
    },
    create(context) {
        return {
            CallExpression(node) {
                if (
                    node.callee.type !== "MemberExpression" ||
                    node.callee.property.type !== "Identifier" ||
                    node.callee.property.name !== "url"
                ) {
                    return;
                }

                const receiver = node.callee.object;
                const isTopLevelZod =
                    receiver.type === "Identifier" && (receiver.name === "z" || receiver.name === "zod");

                if (!isTopLevelZod && !isZodStringChain(receiver)) {
                    return;
                }

                if (isInsideHttpsUrlFunction(node)) {
                    return;
                }

                context.report({
                    node,
                    messageId: "bareUrl",
                });
            },
        };
    },
};

export default rule;
