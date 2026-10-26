/// <reference types="node" />
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Does a client's mirror of a BFF response still match what the BFF declares?
 *
 * apps/embed, apps/mobile and packages/bff-client each parse BFF responses with
 * their own, deliberately partial Zod schemas. They cannot import the server's:
 * the embed ships inside third-party iframes and keeps its bundle free of
 * `@vox-pop/shared`, and mobile's import firewall keeps it off server modules.
 * Until this existed the only thing tying a mirror to the server was a comment
 * saying "keep this honest".
 *
 * The one artifact every workspace can read is the committed
 * `apps/vox-pop-api/openapi.json`, which `openapi:check` keeps equal to the
 * route code. A test converts its mirror with `z.toJSONSchema(schema, { io:
 * 'input' })` and hands it here with the operation it parses; this walks the
 * two side by side and reports where the mirror would break against a response
 * the server is allowed to send:
 *
 * - a field the mirror reads that the server does not declare (renamed or
 *   removed upstream; the mirror silently reads `undefined`);
 * - a field the mirror requires that the server may omit;
 * - a type or enum value the server may send that the mirror rejects.
 *
 * It does not report fields the server sends and the mirror ignores — being
 * partial is the point of a mirror. Formats (`uri`, `date-time`) are not
 * compared: a mirror may validate a URL more strictly than the server declares.
 *
 * Takes JSON Schema rather than a Zod schema so this file needs no `zod` of its
 * own and works whatever copy the calling workspace resolves.
 */

export interface JsonSchema {
    $ref?: string;
    type?: string | string[];
    enum?: unknown[];
    const?: unknown;
    properties?: Record<string, JsonSchema>;
    required?: string[];
    additionalProperties?: boolean | JsonSchema;
    items?: JsonSchema;
    anyOf?: JsonSchema[];
    oneOf?: JsonSchema[];
    allOf?: JsonSchema[];
    $defs?: Record<string, JsonSchema>;
}

interface OpenApiDoc {
    paths: Record<
        string,
        Record<string, { responses?: Record<string, { content?: Record<string, { schema?: JsonSchema }> }> }>
    >;
    components?: { schemas?: Record<string, JsonSchema> };
}

const OPENAPI_PATH = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../apps/vox-pop-api/openapi.json');

let cached: OpenApiDoc | undefined;
function openapi(): OpenApiDoc {
    cached ??= JSON.parse(readFileSync(OPENAPI_PATH, 'utf8')) as OpenApiDoc;
    return cached;
}

type Resolver = (schema: JsonSchema) => JsonSchema;

function serverResolver(doc: OpenApiDoc): Resolver {
    const resolve: Resolver = (schema) => {
        if (!schema.$ref) return schema;
        const name = schema.$ref.replace('#/components/schemas/', '');
        const target = doc.components?.schemas?.[name];
        if (!target) throw new Error(`openapi.json has no component schema ${name}`);
        return resolve(target);
    };
    return resolve;
}

function clientResolver(root: JsonSchema): Resolver {
    const resolve: Resolver = (schema) => {
        if (!schema.$ref) return schema;
        if (schema.$ref === '#') return root;
        const name = schema.$ref.replace('#/$defs/', '');
        const target = root.$defs?.[name];
        if (!target) throw new Error(`client schema has no $defs entry ${name}`);
        return resolve(target);
    };
    return resolve;
}

/** Fold `allOf` into one object schema: properties and `required` are unions. */
function flatten(schema: JsonSchema, resolve: Resolver): JsonSchema {
    const s = resolve(schema);
    if (!s.allOf) return s;
    const parts = [s, ...s.allOf.map((p) => flatten(p, resolve))];
    return {
        ...s,
        allOf: undefined,
        type: parts.find((p) => p.type)?.type,
        properties: Object.assign({}, ...parts.map((p) => p.properties ?? {})),
        required: [...new Set(parts.flatMap((p) => p.required ?? []))],
    };
}

/** The alternatives a schema allows (`anyOf` / `oneOf`), or the schema itself. */
function branches(schema: JsonSchema, resolve: Resolver): JsonSchema[] {
    const s = flatten(schema, resolve);
    const alts = s.anyOf ?? s.oneOf;
    return alts ? alts.flatMap((a) => branches(a, resolve)) : [s];
}

function typesOf(s: JsonSchema): string[] | null {
    if (s.type) return Array.isArray(s.type) ? s.type : [s.type];
    const values = s.enum ?? (s.const !== undefined ? [s.const] : null);
    if (values) return [...new Set(values.map((v) => (v === null ? 'null' : typeof v)))];
    if (s.properties) return ['object'];
    if (s.items) return ['array'];
    return null; // unconstrained
}

function accepts(clientTypes: string[], serverType: string): boolean {
    if (clientTypes.includes(serverType)) return true;
    return serverType === 'integer' && clientTypes.includes('number');
}

interface Ctx {
    client: Resolver;
    server: Resolver;
}

/** Issues for one client branch against one server branch, both already flattened. */
function compareBranch(c: JsonSchema, s: JsonSchema, at: string, ctx: Ctx): string[] {
    const issues: string[] = [];
    const cTypes = typesOf(c);
    const sTypes = typesOf(s);
    if (cTypes && sTypes) {
        for (const t of sTypes) {
            if (!accepts(cTypes, t)) issues.push(`${at}: server may send ${t}, mirror accepts ${cTypes.join(' | ')}`);
        }
    } else if (cTypes && !sTypes) {
        issues.push(`${at}: server declares no type, mirror requires ${cTypes.join(' | ')}`);
    }
    if (issues.length > 0) return issues;

    const cValues = c.enum ?? (c.const !== undefined ? [c.const] : undefined);
    if (cValues) {
        const sValues = s.enum ?? (s.const !== undefined ? [s.const] : undefined);
        if (!sValues) issues.push(`${at}: server allows any value, mirror accepts only ${JSON.stringify(cValues)}`);
        else {
            const missing = sValues.filter((v) => !cValues.includes(v));
            if (missing.length > 0) issues.push(`${at}: server may send ${JSON.stringify(missing)}, mirror rejects it`);
        }
    }

    if (c.properties) {
        // A server-side free-form record (no declared properties) cannot be
        // checked key by key; anything the mirror reads from it is its own risk.
        if (!s.properties) return issues;
        const serverRequired = new Set(s.required ?? []);
        for (const [key, child] of Object.entries(c.properties)) {
            const serverChild = s.properties[key];
            if (!serverChild) {
                issues.push(`${at}.${key}: the mirror reads it, the server does not declare it`);
                continue;
            }
            if ((c.required ?? []).includes(key) && !serverRequired.has(key)) {
                issues.push(`${at}.${key}: the mirror requires it, the server may omit it`);
            }
            issues.push(...compare(child, serverChild, `${at}.${key}`, ctx));
        }
    }

    if (c.items && s.items) issues.push(...compare(c.items, s.items, `${at}[]`, ctx));
    return issues;
}

/**
 * Every server branch must be accepted by some client branch. When none does,
 * the issues from the closest client branch (fewest issues) are reported.
 */
function compare(client: JsonSchema, server: JsonSchema, at: string, ctx: Ctx): string[] {
    const cBranches = branches(client, ctx.client);
    const issues: string[] = [];
    for (const s of branches(server, ctx.server)) {
        const sTypes = typesOf(s);
        const candidates = cBranches.filter((c) => {
            const t = typesOf(c);
            return !t || !sTypes || sTypes.some((st) => accepts(t, st));
        });
        const results = (candidates.length > 0 ? candidates : cBranches).map((c) => compareBranch(c, s, at, ctx));
        if (results.some((r) => r.length === 0)) continue;
        issues.push(...results.reduce((a, b) => (b.length < a.length ? b : a)));
    }
    return [...new Set(issues)];
}

/** The `data` schema of an operation's success envelope in the committed openapi.json. */
function responseData(method: string, route: string, status: string): JsonSchema {
    const doc = openapi();
    const schema = doc.paths[route]?.[method.toLowerCase()]?.responses?.[status]?.content?.['application/json']?.schema;
    if (!schema) throw new Error(`openapi.json declares no JSON ${status} response for ${method} ${route}`);
    const data = flatten(schema, serverResolver(doc)).properties?.data;
    if (!data) throw new Error(`${method} ${route} ${status} is not a { success, data } envelope`);
    return data;
}

/**
 * Where `mirror` (a client schema, as `z.toJSONSchema(schema, { io: 'input' })`)
 * would reject or misread the `data` of a response the server declares for
 * `method route`. Empty when the mirror is sound.
 */
export function mirrorIssues(mirror: object, method: string, route: string, status = '200'): string[] {
    const doc = openapi();
    const client = asSchema(mirror);
    return compare(client, responseData(method, route, status), '$', {
        client: clientResolver(client),
        server: serverResolver(doc),
    });
}

/** Same comparison between two schemas, without openapi.json. For testing this module. */
export function schemaIssues(mirror: object, server: object): string[] {
    const client = asSchema(mirror);
    return compare(client, asSchema(server), '$', { client: clientResolver(client), server: (s) => s });
}

/**
 * Zod's `toJSONSchema` output and a parsed openapi.json are both JSON Schema
 * documents, typed by their producers more loosely or more strictly than the
 * subset this module reads. The walk above only ever reads optional keys and
 * checks each one's shape as it goes, so the narrowing is safe.
 */
function asSchema(value: object): JsonSchema {
    return value as JsonSchema;
}
