import React from 'react';
import ReactDOM from 'react-dom/client';

// Fontsource — ships the @font-face declarations for Rubik + Arvo.
// `embed.css` then wires `--font-rubik` / `--font-arvo` to the loaded
// families. Weights match `RUBIK_CONFIG` / `ARVO_CONFIG` in
// `@vox-pop/design-tokens/fonts`.
//
// `latin-*`, not the bare weight files: those pull every subset Rubik ships
// (arabic, cyrillic, cyrillic-ext, hebrew, latin-ext), which emitted 28 font
// files into the deploy. They are `unicode-range`-gated so a latin reader
// never downloads them, but they still ship on every deploy and every one is a
// separate asset Pages has to serve. The embed renders a creator's prompt
// title and an `@handle`; if non-latin coverage is ever needed, add the
// specific subset here rather than going back to the catch-all files.
import '@fontsource/rubik/latin-400.css';
import '@fontsource/rubik/latin-500.css';
import '@fontsource/arvo/latin-400.css';
import '@fontsource/arvo/latin-700.css';

import './embed.css';
import { App } from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
);
