import React from 'react';
import clsx from 'clsx';
import { AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react';

export function Alert({ type = 'info', title, message, children, className = '' }) {
  const configs = {
    info: {
      container: 'bg-blue-50 border-blue-200 text-blue-800',
      icon: <Info className="w-5 h-5 text-blue-500 shrink-0" />
    },
    success: {
      container: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      icon: <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
    },
    warning: {
      container: 'bg-amber-50 border-amber-200 text-amber-800',
      icon: <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
    },
    error: {
      container: 'bg-red-50 border-red-200 text-red-800',
      icon: <XCircle className="w-5 h-5 text-red-500 shrink-0" />
    }
  };

  const current = configs[type] || configs.info;

  return (
    <div className={clsx('flex gap-3 p-4 border rounded-lg', current.container, className)} role="alert">
      {current.icon}
      <div className="text-sm">
        {title && <h5 className="font-semibold mb-0.5">{title}</h5>}
        {message && <p>{message}</p>}
        {children}
      </div>
    </div>
  );
}

export default Alert;

