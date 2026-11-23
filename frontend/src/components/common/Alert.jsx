import React from 'react';
import clsx from 'clsx';
import { AlertCircle, CheckCircle, Info, XCircle, X } from 'lucide-react';

export function Alert({ type, variant, title, message, children, className = '', onClose }) {
  const alertType = type || variant || 'info';
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

  const current = configs[alertType] || configs.info;

  const renderText = (val) => {
    if (!val) return null;
    if (typeof val === 'string') return val;
    if (typeof val === 'object') {
      return val.message || val.error || val.sku || JSON.stringify(val);
    }
    return String(val);
  };

  return (
    <div className={clsx('flex items-start justify-between gap-3 p-4 border rounded-lg', current.container, className)} role="alert">
      <div className="flex gap-3">
        {current.icon}
        <div className="text-sm">
          {title && <h5 className="font-semibold mb-0.5">{renderText(title)}</h5>}
          {message && <p>{renderText(message)}</p>}
          {children}
        </div>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-700 p-0.5 rounded transition-colors"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export default Alert;

