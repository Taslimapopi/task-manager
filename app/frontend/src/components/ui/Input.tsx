'use client';

import { forwardRef, useId, useState, type ComponentType, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    leftIcon?: ComponentType<{ className?: string }>;
    /** Helper text shown below the field when there is no error. */
    hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
    { label, error, hint, className = '', type = 'text', leftIcon: LeftIcon, id, ...props },
    ref,
) {
    const [showPassword, setShowPassword] = useState(false);

    /**
     * `useId` supplies an id when the caller does not.
     *
     * The label was previously a bare `<label>` with no `htmlFor`, so clicking it did
     * nothing and assistive tech announced the field as unlabelled — several call
     * sites pass an `id` but the component never used it. Falling back to a generated
     * id means the association holds even for the call sites that pass nothing.
     */
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;

    const isPassword = type === 'password';
    const inputType = isPassword && showPassword ? 'text' : type;

    const describedBy = error ? errorId : hint ? hintId : undefined;

    return (
        <div className="w-full">
            {label && (
                <label htmlFor={inputId} className="block text-sm font-medium text-gray-300 mb-1.5">
                    {label}
                </label>
            )}

            <div className="relative w-full flex items-center">
                {LeftIcon && (
                    <div className="absolute left-3.5 text-gray-400 pointer-events-none flex items-center justify-center">
                        <LeftIcon className="w-5 h-5" />
                    </div>
                )}

                <input
                    ref={ref}
                    id={inputId}
                    type={inputType}
                    // Announces the invalid state, which a red border alone does not convey.
                    aria-invalid={error ? true : undefined}
                    aria-describedby={describedBy}
                    className={`w-full ${LeftIcon ? 'pl-10' : 'pl-4'} ${
                        isPassword ? 'pr-11' : 'pr-4'
                    } py-2.5 bg-[#0f172a] border rounded-xl text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                        error
                            ? 'border-red-500/50 focus:ring-red-500/30 focus:border-red-500'
                            : 'border-white/10 focus:ring-indigo-500/30 focus:border-indigo-500'
                    } ${className}`}
                    {...props}
                />

                {isPassword && (
                    <button
                        type="button"
                        onClick={() => setShowPassword((visible) => !visible)}
                        // Without this the control reads as an unlabelled button, and the
                        // pressed state is invisible to a screen reader.
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        aria-pressed={showPassword}
                        // Excluded from the tab order: it duplicates no functionality a
                        // keyboard user needs mid-form, and sits between the field and submit.
                        tabIndex={-1}
                        className="absolute right-3 text-gray-400 hover:text-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 p-1 rounded-lg hover:bg-white/5 transition-colors"
                    >
                        {showPassword ? (
                            <EyeOff className="w-5 h-5" aria-hidden="true" />
                        ) : (
                            <Eye className="w-5 h-5" aria-hidden="true" />
                        )}
                    </button>
                )}
            </div>

            {/*
        `role="alert"` so the message is announced when it appears, rather than
        only being found by a user who happens to navigate back to the field.
      */}
            {error ? (
                <p id={errorId} role="alert" className="mt-1.5 text-xs text-red-400 font-medium">
                    {error}
                </p>
            ) : hint ? (
                <p id={hintId} className="mt-1.5 text-xs text-gray-400">
                    {hint}
                </p>
            ) : null}
        </div>
    );
});