/**
 * `@vox-pop/brand-ui/static` — the presentational subset, with no hooks.
 *
 * The package barrel (`.`) re-exports `ReplyDot`, `ListenDot` and the recorder,
 * which hold state and effects; importing `DotMark` through it drags all of that
 * into the importer's bundle. That pushed apps/public's `EditorialNotice` (the
 * 404 and error frame) into hand-drawing circles and copying typography classes
 * rather than pay for it. This entry holds only components that render from
 * props: the dot mark, the string between dots, and the editorial type scale.
 *
 * Keep it that way. Anything added here must be hook-free in its own body, so a
 * page that imports only this entry stays cheap to render and hydrate.
 */
export { DotMark } from './components/DotMark';
export type { DotMarkVariant, DotMarkTone } from './components/DotMark';
export { DotString } from './components/DotString';
export {
    EditorialDisplay,
    EditorialTitle,
    EditorialLede,
    EditorialMeta,
} from './components/typography';
