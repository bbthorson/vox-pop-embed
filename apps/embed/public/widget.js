(function () {
    // Prevent double registration
    if (customElements.get('vox-pop-prompt')) return;

    // Capture the loading script's origin synchronously. `document.currentScript`
    // is only valid during this initial execution, not inside the later element
    // callbacks — so resolve it once here and reuse it in getDomain().
    //
    // This widget.js is served from the EMBED origin (embed.voxpop.audio in
    // production). Because the iframe target is derived from the script's own
    // origin, the element frames `<embed origin>/{handle}/{promptId}` — the
    // standalone, chrome-less, COOKIE-LESS recorder app (apps/embed), which is
    // safe to frame from any third-party site. This is the public embeddable
    // widget: the snippet a creator pastes on their own page.
    //
    // The embed is the only origin meant to be framed by third parties: the
    // public prompt page carries a session cookie, so it refuses framing from
    // anywhere but itself and the embed origin.
    const SCRIPT_ORIGIN = (() => {
        try {
            if (document.currentScript && document.currentScript.src) {
                return new URL(document.currentScript.src).origin;
            }
        } catch { }
        return null;
    })();

    const TEMPLATE = document.createElement('template');
    TEMPLATE.innerHTML = `
    <style>
      :host {
        display: block;
        width: 100%;
        min-height: 600px;
        overflow: hidden;
        border-radius: 8px;
        background: transparent;
      }
      iframe {
        width: 100%;
        height: 100%;
        border: none;
        display: block;
      }
    </style>
    <iframe allow="microphone" scrolling="no" style="overflow:hidden"></iframe>
  `;

    class VoxPopPrompt extends HTMLElement {
        constructor() {
            super();
            this.attachShadow({ mode: 'open' });
            this.shadowRoot.appendChild(TEMPLATE.content.cloneNode(true));
            this._iframe = this.shadowRoot.querySelector('iframe');
        }

        static get observedAttributes() {
            return ['handle', 'prompt-id', 'height', 'mode'];
        }

        attributeChangedCallback(name, oldValue, newValue) {
            if (oldValue !== newValue) {
                this.render();
            }
        }

        connectedCallback() {
            this.render();
        }

        getDomain() {
            // Prefer the origin captured at load time (above).
            if (SCRIPT_ORIGIN) return SCRIPT_ORIGIN;
            // Fallback (e.g. ES-module load where currentScript was null): find
            // the widget.js script tag. Works on localhost + production.
            try {
                const scripts = document.querySelectorAll('script');
                for (let script of scripts) {
                    if (script.src && script.src.includes('/widget.js')) {
                        return new URL(script.src).origin;
                    }
                }
            } catch { }
            return window.location.origin; // Last-resort fallback
        }

        render() {
            const handle = this.getAttribute('handle');
            const promptId = this.getAttribute('prompt-id');
            const height = this.getAttribute('height');
            const mode = this.getAttribute('mode') || 'embed';

            if (height) {
                this.style.height = height;
            } else if (mode === 'card') {
                // Card mode is compact — auto-size instead of 600px min
                this.style.minHeight = '160px';
                this.style.height = 'auto';
            }

            if (handle && promptId) {
                const domain = this.getDomain();
                // The embed app (apps/embed) is inherently chrome-less and parses
                // `/{handle}/{promptId}` from its own path, ignoring query params —
                // so no `?mode=embed` is needed (that flag is an apps/public render
                // switch). We still forward `mode` so future embed-app modes work.
                const newSrc = `${domain}/${handle}/${promptId}?mode=${mode}`;
                // Both connectedCallback and attributeChangedCallback call
                // render() during init; only touch src when it actually changes
                // so we don't trigger a redundant iframe reload. Compare the
                // resolved `.src` property (always an absolute URL) rather than
                // getAttribute('src') (literal/possibly-null) so the equality
                // check is reliable.
                if (this._iframe.src !== newSrc) {
                    this._iframe.src = newSrc;
                }
            }
        }
    }

    customElements.define('vox-pop-prompt', VoxPopPrompt);
})();
