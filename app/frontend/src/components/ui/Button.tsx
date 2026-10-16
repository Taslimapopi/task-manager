'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    isLoading?: boolean;
}

const BASE_CLASSES =
    'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f172a] disabled:opacity-50 disabled:pointer-events-none';

/**
 * Hoisted to module scope.
 *
 * These maps are constant, so rebuilding them inside the render body allocated
 * two fresh objects on every render of every button on the page — and this is the
 * most-rendered component in the app.
 */
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
    primary:
        'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:shadow-lg hover:shadow-indigo-500/20 focus-visible:ring-indigo-500',
    secondary:
        'bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white focus-visible:ring-indigo-500',
    danger:
        'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 focus-visible:ring-red-500',
    ghost: 'bg-transparent text-gray-400 hover:bg-white/5 hover:text-white focus-visible:ring-indigo-500',
    outline:
        'bg-transparent border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white focus-visible:ring-indigo-500',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
    sm: 'text-sm px-3 py-1.5',
    md: 'text-sm px-4 py-2',
    lg: 'text-base px-6 py-3',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
    {
        children,
        variant = 'primary',
        size = 'md',
        className = '',
        isLoading = false,
        disabled,
        type = 'button',
        ...props
    },
    ref,
) {
    return (
        <button
            ref={ref}
            /**
             * `type` defaults to `'button'`, not the HTML default of `'submit'`.
             *
             * Every plain `<Button onClick=…>` inside a `<form>` — the modal footers, the
             * bulk-add row controls — would otherwise submit that form as well as running
             * its handler. Callers that want a submit button pass `type="submit"`
             * explicitly, as the forms here already do.
             */
            type={type}
            /**
             * `disabled` and `type` are destructured out of `props` above, which is what
             * makes this correct.
             *
             * The spread used to come *after* `disabled={isLoading || props.disabled}`,
             * and a later JSX attribute wins — so `props.disabled` was re-applied over
             * the computed value and `isLoading` never disabled anything. A button in its
             * loading state stayed clickable, which is precisely the state where a second
             * click fires a duplicate mutation: a double-submitted task, or two delete
             * requests for the same row.
             */
            disabled={isLoading || disabled}
            aria-busy={isLoading || undefined}
            className={`${BASE_CLASSES} ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
            {...props}
        >
            {/*
        `aria-hidden` on the spinner: `aria-busy` above already conveys the loading
        state, so exposing the icon as well makes a screen reader announce it twice.
      */}
            {isLoading && <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" aria-hidden="true" />}
            {children}
        </button>
    );
});