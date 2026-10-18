import React from 'react';
import { cn } from '../utils/cn';

type EditorialProps<T extends React.ElementType> = {
    as?: T;
    className?: string;
    children: React.ReactNode;
} & Omit<React.ComponentPropsWithoutRef<T>, 'as' | 'className' | 'children'>;

/**
 * Display-scale serif heading for public-page heroes.
 * Fluid size 32–44px, tight tracking, `ink-strong` color.
 */
export function EditorialDisplay<T extends React.ElementType = 'h1'>({
    as,
    className,
    children,
    ...rest
}: EditorialProps<T>) {
    const Component = (as || 'h1') as React.ElementType;
    return (
        <Component
            className={cn(
                'font-heading font-bold text-ink-strong',
                'text-[clamp(2rem,4vw+1rem,2.75rem)]',
                'tracking-editorial leading-editorial',
                'max-w-prose',
                className
            )}
            {...rest}
        >
            {children}
        </Component>
    );
}

/**
 * Section title — serif, smaller than Display. Used for profile names, card titles.
 * Fluid 22–28px.
 */
export function EditorialTitle<T extends React.ElementType = 'h2'>({
    as,
    className,
    children,
    ...rest
}: EditorialProps<T>) {
    const Component = (as || 'h2') as React.ElementType;
    return (
        <Component
            className={cn(
                'font-heading font-bold text-ink-strong',
                'text-[clamp(1.375rem,1.5vw+1rem,1.75rem)]',
                'tracking-editorial leading-editorial',
                className
            )}
            {...rest}
        >
            {children}
        </Component>
    );
}

/**
 * Lede paragraph — slightly larger than body, muted ink, relaxed leading.
 * Used under Display headings for prompt descriptions and creator bios.
 */
export function EditorialLede<T extends React.ElementType = 'p'>({
    as,
    className,
    children,
    ...rest
}: EditorialProps<T>) {
    const Component = (as || 'p') as React.ElementType;
    return (
        <Component
            className={cn(
                'font-sans text-ink-muted',
                'text-base md:text-lg leading-relaxed',
                'max-w-prose',
                className
            )}
            {...rest}
        >
            {children}
        </Component>
    );
}

/**
 * Meta label — small tracked caps in Arvo. Used for reply counts,
 * timestamps, "Share this prompt" style affordances.
 *
 * The editorial expression of `MetaLabel` (`packages/ui`), on the same tokens:
 * `tracking-meta`, and Courier Prime under `.register-marketing`. It keeps its
 * own markup only because brand-ui does not depend on `@vox-pop/ui`.
 */
export function EditorialMeta<T extends React.ElementType = 'span'>({
    as,
    className,
    children,
    ...rest
}: EditorialProps<T>) {
    const Component = (as || 'span') as React.ElementType;
    return (
        <Component
            className={cn(
                'font-heading font-bold text-ink-subtle',
                'text-xs uppercase tracking-meta',
                '[.register-marketing_&]:font-mono [.register-marketing_&]:font-normal',
                className
            )}
            {...rest}
        >
            {children}
        </Component>
    );
}
