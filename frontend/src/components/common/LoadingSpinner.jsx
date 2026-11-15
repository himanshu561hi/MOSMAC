import React from 'react';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

export function LoadingSpinner({ size = 'md', className = '', message }) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className={clsx('flex flex-col items-center justify-center p-4', className)}>
      <Loader2 className={clsx('animate-spin text-emerald-600', sizes[size])} />
      {message && <p className="mt-2 text-sm text-gray-500 font-medium">{message}</p>}
    </div>
  );
}

export default LoadingSpinner;

