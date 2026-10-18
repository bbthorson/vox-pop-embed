'use client';

import React from 'react';
import { m } from 'framer-motion';
import { Mic, Play } from 'lucide-react';

interface PromptCardProps {
    title: string;
    description?: string | null;
    authorName?: string;
    authorHandle?: string;
    authorAvatarUrl?: string;
    hasAudio?: boolean;
    promptUrl: string;
    /**
     * App name shown in the CTA copy (`Reply on {appName} →`). Defaults
     * to "Vox Pop" — apps/web overrides with `APP_CONFIG.NAME` (which is
     * also "Vox Pop" today, but routed through the prop so brand-ui
     * doesn't have to import apps/web's config).
     */
    appName?: string;
}

/**
 * PromptCard — Compact embed card for a Vox Pop prompt.
 *
 * Designed for inline embedding on third-party sites (Surf.Social, blogs, etc.).
 * Shows prompt title, author, and a CTA button that links out to the full
 * prompt page. No iframe, no auth — just a lightweight card.
 *
 * Used when `?mode=card` is passed to the prompt page.
 */
export function PromptCard({
    title,
    description,
    authorName,
    authorHandle,
    authorAvatarUrl,
    hasAudio,
    promptUrl,
    appName = 'Vox Pop',
}: PromptCardProps) {
    return (
        <m.div
            className="w-full max-w-md mx-auto"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <a
                href={promptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-xl border border-border bg-card p-4 hover:border-primary/40 hover:shadow-md transition-all group"
            >
                {/* Author row */}
                {(authorName || authorHandle) && (
                    <div className="flex items-center gap-2 mb-3">
                        {authorAvatarUrl ? (


                            <img
                                src={authorAvatarUrl}
                                alt=""
                                className="w-6 h-6 rounded-full object-cover"
                            />
                        ) : (
                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                                <Mic className="w-3 h-3 text-primary" />
                            </div>
                        )}
                        <span className="text-xs text-muted-foreground truncate">
                            {authorName || `@${authorHandle}`}
                        </span>
                    </div>
                )}

                {/* Title */}
                <h2 className="text-base font-bold font-heading leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                    {title}
                </h2>

                {/* Description */}
                {description && (
                    <p className="text-sm text-muted-foreground mt-1 leading-snug line-clamp-2">
                        {description}
                    </p>
                )}

                {/* Footer: audio indicator + CTA */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        {hasAudio && (
                            <>
                                <Play className="w-3 h-3" />
                                <span>Audio prompt</span>
                            </>
                        )}
                    </div>
                    <span className="text-xs font-medium text-primary group-hover:underline">
                        Reply on {appName} &rarr;
                    </span>
                </div>
            </a>
        </m.div>
    );
}
