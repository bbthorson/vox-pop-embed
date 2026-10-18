# @vox-pop/embed

The Vox Pop embed widget: a small recorder that lets listeners leave a voice reply
to a creator's prompt from any website.

It is two pieces:

- **`public/widget.js`**: a hand-written script that registers a
  `<vox-pop-prompt>` custom element. The element renders an iframe pointing back
  at the origin the script was loaded from.
- **The iframe app** (`src/`): a Vite single-page app (Preact through
  `preact/compat`) that shows the prompt, records the reply and uploads it. It is
  chrome-less, sets no cookies and has no sign-in, so any site can frame it.

The UI comes from `@vox-pop/brand-ui`, and the colours, type and Tailwind preset
from `@vox-pop/design-tokens`.

## Using it on a page

```html
<script src="https://embed.voxpop.audio/widget.js" async></script>
<vox-pop-prompt handle="yourhandle" prompt-id="PROMPT_ID"></vox-pop-prompt>
```

| Attribute | Meaning |
| --- | --- |
| `handle` | The creator's Vox Pop handle, without the `@`. |
| `prompt-id` | The prompt's id, from its URL (`voxpop.audio/@handle/PROMPT_ID`). |
| `height` | Optional CSS height. The default is a 600px minimum. |
| `mode` | Optional. `card` is a compact layout that sizes itself; the default is `embed`. |

The iframe asks for `allow="microphone"`. The listener's browser prompts for
microphone access the first time they record.

## How a reply gets in

The widget calls three anonymous endpoints of the Vox Pop API, all part of the
public, versioned contract (see the API reference at voxpop.audio/developers):

1. `GET /api/v1/prompts/{postId}`: the prompt and its audio.
2. `GET /api/v1/users/{handle}`: the creator's public profile.
3. `POST /api/v1/audio/upload-pending`: the recorded reply, held for ten minutes.

After the upload, the widget sends the top window to the prompt page on the host
app with `?pending=<id>`. The listener confirms their phone number there and the
reply is filed. Nothing in the iframe ever signs in.

## Running it locally

Requires Node 22.

```bash
npm install
npm run build:packages:embed   # builds design-tokens and brand-ui
npm run dev -w @vox-pop/embed  # http://localhost:5173
```

Open `http://localhost:5173/{handle}/{promptId}`. The app needs a Vox Pop API to
talk to. Configure it with two build-time variables, copied from `.env.example`:

| Variable | What it is | Local default |
| --- | --- | --- |
| `VITE_VOXPOP_API_BASE_URL` | Origin of the Vox Pop API | `http://localhost:8091` |
| `VITE_HOST_APP_BASE_URL` | Origin of the public prompt page that finishes the reply | `http://localhost:9002` |

The API must list the embed's origin in its CORS allowlist. A missing entry shows
up as a network error, not a 404.

Other scripts: `npm run test`, `npm run lint` and `npm run typecheck` (each with
`-w @vox-pop/embed`).

## Building and deploying

```bash
npm run build -w @vox-pop/embed
```

This writes a static site to `dist/`, plus `dist/version.json` (built from
`COMMIT_SHA` and `BUILD_TIME`, when set). `wrangler.jsonc` deploys it as an
**assets-only Cloudflare Worker**: no Worker script, with SPA routing from
`not_found_handling: "single-page-application"` and caching rules from
`public/_headers`. `npx wrangler dev` runs it in the real Workers runtime, where
that routing and those headers take effect. `vite preview` doesn't apply them.

> **Never add `X-Frame-Options` or a `frame-ancestors` CSP to this app.** Third-party
> sites frame it from arbitrary origins, and oEmbed unfurls point at it. A frame
> header here silently breaks every embed in the wild.

### How Vox Pop deploys it

In the Vox Pop monorepo, the `deploy_embed` job in `.github/workflows/deploy.yml`
deploys this app to `embed.voxpop.audio` after CI passes on `master`. It runs a
clean install scoped to this workspace (`npm ci --workspace=apps/embed`), then
`npm run build:cf -w @vox-pop/embed`, then `wrangler deploy`, and checks that
`/version.json` reports the deployed commit. Cloudflare Workers Builds also
builds each push, as a preview only; its watch paths are kept in step by
`scripts/workers-builds-config.mjs`.

`build:cf` builds only this app's two workspace packages, because the scoped
install brings in nothing else from the monorepo. The one file the app reads
from `@vox-pop/shared`, `types/audio-limits.ts` (the recording cap), comes in
through a path alias rather than a package dependency.

## Source

This app is open-sourced as a one-way mirror,
[bbthorson/vox-pop-embed](https://github.com/bbthorson/vox-pop-embed). The
private Vox Pop monorepo is the source of truth. Issues are welcome on the
mirror; pull requests are re-applied upstream with credit and come back in the
next sync.
