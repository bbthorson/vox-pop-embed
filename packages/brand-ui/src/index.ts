/**
 * `@vox-pop/brand-ui` — public surface.
 *
 * **Vox Pop's signature presentation layer**, and the shared visual language of
 * every client: the dot-mark family, editorial typography, the motion providers
 * and presets, the audio recorder, and the composed `EmbedPrompt`. Distinct from
 * `@vox-pop/ui`, which is the generic shadcn/Radix primitive layer underneath.
 *
 * The MediaRecorder state machine it used to own is gone — that is
 * `@antiphony/capture-kit` now (browser primitives, no styling, no protocol
 * knowledge). What is left here is the half that is a product judgement rather
 * than a fact about the audio: what a record button looks like.
 *
 * All three clients consume it, and it is worth knowing the shape of that,
 * because the name used to imply otherwise:
 *
 *   - **apps/web** (dashboard) — typography, `AudioDot`, `HairlineRipple`,
 *     `RecordingContent`, `MotionProviderMax`.
 *   - **apps/public** (capture) — the dot family, typography, motion.
 *   - **apps/embed** — exactly one export, `EmbedPrompt`, which is itself a
 *     composition of the primitives the other two use.
 *
 * Renamed from `@vox-pop/embed-ui` on 2026-08-22. The old name was after the
 * *smallest* of the three consumers, and its doc here still claimed the package
 * served "apps/web's public pages" — a surface that moved to apps/public in the
 * capture split. Between the two, reading the dependency graph suggested the
 * dashboard was pulling in embed code, when what it actually pulls is the
 * design system.
 *
 * Framework-portable: no Next.js, Firebase, or apps/web-specific imports.
 * App-specific concerns (auth, audio storage, navigation, host URL) arrive via
 * the ports defined in `./ports`.
 */

// Components
export { ReplyDot } from './components/ReplyDot';
export { ListenDot } from './components/ListenDot';
export type { ListenDotMediaSession } from './components/ListenDot';
/**
 * `AudioDot` is what most consumers want: the `DotMark` + `ListenDot` pair
 * with the text-only fallback and the playback-error notice already wired.
 * Reach for the bare `ListenDot` only when you're supplying your own circle.
 */
export { AudioDot } from './components/AudioDot';
export type { AudioDotProps } from './components/AudioDot';
export { RecordingContent } from './components/RecordingContent';
export type { RecordPhase } from './components/RecordingContent';
export { DotMark } from './components/DotMark';
export type { DotMarkVariant, DotMarkTone } from './components/DotMark';
export { DotPair } from './components/DotPair';
export { DotString } from './components/DotString';
export { EmbedPrompt } from './components/EmbedPrompt';
export type { EmbedPromptProps } from './components/EmbedPrompt';
export { HairlineRipple } from './components/HairlineRipple';
export { CaptureSweep } from './components/CaptureSweep';
export { MergedDotSuccess } from './components/MergedDotSuccess';
export { PromptCard } from './components/PromptCard';
/**
 * Motion feature providers. Every component above renders `m.*`, which needs
 * ONE of these as an ancestor — see the files for which to pick. Exported from
 * separate modules so an app that only needs the animation subset never pulls
 * layout projection into its bundle.
 */
export { MotionProvider } from './components/MotionProvider';
export { MotionProviderMax } from './components/MotionProviderMax';
export {
    EditorialDisplay,
    EditorialTitle,
    EditorialLede,
    EditorialMeta,
} from './components/typography';

// Hooks (exposed because apps may render auxiliary surfaces that
// need them — e.g., apps/web's TwoDotsAuthProvider uses
// `useContainerSize` for its own measurements).
export { useContainerSize } from './hooks/use-container-size';

/**
 * `useAudioRecorder` used to be exported from here. The MediaRecorder state
 * machine now lives in `@antiphony/capture-kit` — import it from there.
 *
 * Deliberately not re-exported, and neither is `recorderErrorMessage` beside
 * it: no app ever imported the hook (both consumers are components in this
 * package), and the error copy reaches consumers already mapped, through
 * `ReplyDot`'s `onError` and `RecordingContent`'s `onPermissionError`. Passing
 * either through the design system would add a name to keep in step and buy
 * nothing. What stays here is the half the kit deliberately does not have —
 * the dots, `HairlineRipple`, the motion presets: what a record button looks
 * like, rather than how a microphone works.
 */

// Dot geometry — the shared source of truth for control/glyph sizes and the
// canonical dot diameters. Exported so consumers stop re-typing `w-40 h-40`
// and the `size-[clamp(...)]` expressions.
export {
    DOT_SIZE,
    DOT_PRIMARY_CONTROL,
    DOT_PRIMARY_ICON,
    DOT_STOP_ICON,
    DOT_PLAYBACK_ICON_MAX,
    DOT_PLAYBACK_ICON_MIN,
    playbackIconSize,
    playGlyphOffset,
} from './dot-metrics';

// Motion presets (shared dot-family animation vocabulary)
export {
    phaseTransition,
    micBreathing,
    buttonScalePrimary,
    buttonScaleSecondary,
    iconSwap,
    dotStringSettle,
    EASE_STANDARD,
} from './motion';

// Ports (interfaces apps fulfill with adapters)
export type {
    AuthProvider,
    AudioUploader,
    DotsAuthGate,
    LinkComponent,
} from './ports';
