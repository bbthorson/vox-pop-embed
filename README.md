# vox-pop-embed

The [Vox Pop](https://voxpop.audio) embed widget: a drop-in recorder that lets
listeners leave a voice reply to a creator's prompt from any website.

```html
<script src="https://embed.voxpop.audio/widget.js" async></script>
<vox-pop-prompt handle="yourhandle" prompt-id="PROMPT_ID"></vox-pop-prompt>
```

This repository is a **one-way mirror**. Vox Pop's private monorepo is the source
of truth, and this tree is regenerated from it on every change: see `SOURCE` for
the commit. Please don't expect changes made here to stick. Read
[CONTRIBUTING.md](CONTRIBUTING.md) for how contributions get in.

Code comments sometimes cite paths such as `specs/design-system.md` or
`docs/...`. Those are Vox Pop's internal design notes in the private
monorepo; they aren't in this repository.

## What's here

| Path | What it is |
| --- | --- |
| [`apps/embed`](apps/embed) | The widget: `public/widget.js` (the `<vox-pop-prompt>` element) and the iframe app it loads. **Start with its [README](apps/embed/README.md).** |
| [`packages/brand-ui`](packages/brand-ui) | Vox Pop's UI components: the dot mark family, the recorder and the composed embed layout. Recording uses [`@antiphony/capture-kit`](https://www.npmjs.com/package/@antiphony/capture-kit). |
| [`packages/design-tokens`](packages/design-tokens) | Colours, type, motion and the shared Tailwind preset. |
| `packages/shared/types/audio-limits.ts` | The one file the widget reads from Vox Pop's shared package: the recording length cap. |
| `eslint-config`, `eslint-rules`, `vitest-config`, `tsconfig` | Build and lint configuration, kept at the paths the packages expect. |

## Quick start

Requires Node 22 (see `.nvmrc`).

```bash
npm install
npm run dev     # builds the packages, then serves the widget at http://localhost:5173
npm test
npm run build   # static site in apps/embed/dist
```

The widget talks to the public Vox Pop API. The three endpoints it calls are part
of the versioned public contract, documented at
[voxpop.audio/developers](https://voxpop.audio/developers).

## Licence

The code is [MIT](LICENSE). The Vox Pop name and logo are not covered by that
licence: see [TRADEMARKS.md](TRADEMARKS.md).

The fonts (Rubik and Arvo) are installed from npm through `@fontsource` and are
licensed under the [SIL Open Font License 1.1](https://openfontlicense.org).
