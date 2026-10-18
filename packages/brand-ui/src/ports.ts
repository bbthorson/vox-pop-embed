/**
 * Port interfaces for the public/embed components.
 *
 * These interfaces let `ReplyDot` and `MergedDotSuccess` work without
 * directly importing `useAuth()`, the storage-client, `useTwoDotsAuth()`,
 * or Next.js `Link`. Callers provide adapters that fulfill the
 * interfaces — the public prompt page wires up its session-auth and BFF
 * upload implementations, embed contexts pass `null` (or no-op adapters)
 * because they don't need auth.
 *
 * Why ports + adapters here:
 *
 * The same `<ReplyDot>` renders inside both the public prompt page (with
 * phone-OTP session auth and BFF uploads as the implementations) AND the
 * standalone `apps/embed/` Vite app (with no auth and a raw fetch as the
 * implementation). Decoupling component
 * code from framework/SDK choices is the only way to avoid duplicating
 * the UX.
 */

import type React from 'react';

/**
 * Surface the component needs from the auth layer. Apps/web fulfills
 * this with a wrapper around `useAuth()`; the standalone embed passes
 * `null` (it never auths in the iframe — auth happens on the host
 * domain after the top-frame redirect).
 *
 * The surface is intentionally narrow — only the three fields ReplyDot
 * actually touches (out of the eight `useAuth()` returns). Adding to
 * this interface forces an explicit decision about whether brand-ui
 * components really need that field.
 */
export interface AuthProvider {
    user: { uid: string; phoneNumber?: string } | null;
    authService: { currentUser: { uid: string } | null } | null;
    authenticatedApi: {
        getToken(forceRefresh?: boolean): Promise<string | null>;
        postData<T>(path: string, body: unknown): Promise<T>;
    };
    /**
     * Optional Stream 4 reply-submit hook. When provided, ReplyDot's
     * on-domain reply routes through this (→ Vox Pop BFF → Antiphony
     * reply-post) instead of the legacy `authenticatedApi.postData('/replies',
     * …)`. The APP owns the Antiphony payload shaping (parentPostId + audio
     * embed) so brand-ui stays protocol-agnostic and dependency-free.
     *
     * Receives whatever the uploader returned — `audioRef` (the opaque protocol
     * payload the app then embeds) and `audioUrl` (the legacy string) — plus the
     * blob itself. Absent ⇒ legacy core-api submit. Only the on-domain path uses
     * it; the standalone embed's `submitPendingEmbed` handoff is unaffected.
     */
    submitReply?(input: {
        promptId: string;
        audioUrl: string;
        audioRef?: unknown;
        audioBlob: Blob;
    }): Promise<void>;
}

/**
 * How components upload audio. The public prompt page wraps its BFF
 * upload client + storage-path helper. The standalone embed never uses this —
 * its only upload path is anonymous `fetch` to
 * `/api/v1/audio/upload-pending`, which ReplyDot handles inline (no
 * port needed for that path).
 */
export interface AudioUploader {
    uploadAudio(blob: Blob, path: string): Promise<UploadedAudio>;
    getReplyStoragePath(promptId: string, uid: string): string;
}

/**
 * What an upload yields. Two shapes, because the two backends reference stored
 * audio differently and the references are NOT interchangeable:
 *
 *  - legacy core-api → `url` (a storage URL string), sent as `audioUrl` on the
 *    legacy `/replies` submit.
 *  - Vox Pop BFF → `audioRef`, an opaque protocol payload (today: an Antiphony
 *    `BlobRef`, content-addressed by CID).
 *
 * `audioRef` is deliberately `unknown` here: brand-ui never inspects it, it
 * only hands it back to `submitReply`, and the APP owns all protocol shaping.
 * That's what keeps brand-ui protocol-agnostic and dependency-free — typing it
 * as `BlobRef` would drag the Antiphony schema into every embed consumer.
 */
export interface UploadedAudio {
    url: string;
    path: string;
    audioRef?: unknown;
}

/**
 * The auth-gate orchestration layer. Apps/web's `TwoDotsAuthContext`
 * holds the OTP sheet + the merge-animation state machine; ReplyDot
 * needs to signal "user needs to auth" / "auth done — go" / "merge
 * animation, please" via this gate. The standalone embed never opens
 * the gate (auth happens on the host domain).
 */
export interface DotsAuthGate {
    /** Show the auth sheet. Calls `onAuthenticated` after a successful auth, `onCancel` if the user dismisses. */
    requestAuth(onAuthenticated: () => void, onCancel: () => void): void;
    /** Close the auth sheet without proceeding. */
    dismissAuth(): void;
    /** Trigger the merge-animation phase after a successful reply submission. */
    setMergeState(state: { phase: 'merging' | 'merged'; isNewUser: boolean } | null): void;
}

/**
 * A component that renders a link. Apps/web passes Next.js `Link` so
 * client-side navigation works; the standalone embed passes a plain
 * `<a>` (or undefined — `MergedDotSuccess` falls back to a default
 * anchor when no LinkComponent is provided).
 *
 * Shape mirrors `next/link` + plain anchor's intersection: `href`,
 * `children`, optional `className`. Internal navigation niceties (the
 * `prefetch` prop, `replace`, etc.) aren't needed here.
 */
export type LinkComponent = (props: {
    href: string;
    children: React.ReactNode;
    className?: string;
}) => React.ReactNode;
