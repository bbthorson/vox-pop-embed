/**
 * Tailwind class strings shared by both component packages.
 *
 * `@vox-pop/ui` and `@vox-pop/brand-ui` cannot import each other, so a
 * treatment both need lives here, in the package both already depend on.
 * Before this existed, `MetaLabel` (ui) and `EditorialMeta` (brand-ui) each
 * spelled the meta-label treatment out, and the two drifted on tracking.
 *
 * These are plain strings: no `cn`, no runtime. Every app's Tailwind `content`
 * scans this one file, so a class added here is generated wherever it is used.
 * Keep it to complete literal class names; Tailwind cannot see a computed one.
 *
 * Why `.mjs` with a hand-written `classes.d.ts`, not a `.ts` compiled to dist:
 * this ships BUILD-FREE, like `tokens.css`. ui and brand-ui compile in their
 * `prepare` scripts during `npm ci`, before anything has built design-tokens'
 * dist, so a dist-only subpath does not exist yet when they need it. ESM rather
 * than CJS because Vite serves linked workspace packages to the browser
 * unbundled.
 */

/**
 * Small uppercase meta text: section labels, status badges, eyebrows,
 * editorial meta lines.
 *
 * The face and tracking follow the register the label sits in, so callers
 * never choose them:
 * - workspace and capture: Arvo bold, `tracking-label` (0.08em);
 * - `.theme-editorial`: Arvo bold, `tracking-meta` (0.12em);
 * - `.register-marketing`: Courier Prime (`font-mono`, regular), `tracking-meta`.
 *
 * Arvo ships only 400 and 700, so this is `font-bold`, never `font-semibold`
 * (which resolves to a synthesized weight). Size and colour are the caller's.
 */
export const META_LABEL_CLASS =
    'font-heading font-bold uppercase tracking-label ' +
    '[.theme-editorial_&]:tracking-meta ' +
    '[.register-marketing_&]:font-mono [.register-marketing_&]:font-normal [.register-marketing_&]:tracking-meta';
