import React from 'react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

const cn = (...inputs) => twMerge(clsx(inputs));

export const Input = React.forwardRef(function Input(
  {
    label,
    error,
    helperText,
    id,
    type = 'text',
    className = '',
    labelClassName = '',
    required = false,
    variant = 'light',
    style = {},
    ...props
  },
  ref
) {
  const inputId = id || props.name || Math.random().toString(36).substring(7);
  const isDark = variant === 'dark';

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className={cn(
            'block text-sm font-medium mb-1',
            isDark ? 'text-slate-200' : 'text-gray-700',
            labelClassName
          )}
        >
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        type={type}
        style={{
          ...(isDark
            ? {
                backgroundColor: '#020617',
                color: '#ffffff',
                borderColor: '#334155'
              }
            : {}),
          ...style
        }}
        className={cn(
          'w-full px-3.5 py-2 text-sm rounded-lg transition-colors shadow-sm',
          isDark
            ? 'bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-emerald-500 focus:border-emerald-500'
            : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-emerald-500 focus:border-emerald-500',
          error && (isDark ? 'border-red-500 text-red-200 focus:ring-red-500' : 'border-red-300 text-red-900 focus:ring-red-500 focus:border-red-500'),
          className
        )}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      {!error && helperText && (
        <p className={cn('mt-1 text-xs', isDark ? 'text-slate-400' : 'text-gray-500')}>
          {helperText}
        </p>
      )}
    </div>
  );
});

export default Input;

