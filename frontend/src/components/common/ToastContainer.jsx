import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { removeToast } from '@/store/slices/uiSlice';

function ToastItem({ toast }) {
  const dispatch = useDispatch();

  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch(removeToast(toast.id));
    }, toast.duration || 4000);

    return () => clearTimeout(timer);
  }, [dispatch, toast.id, toast.duration]);

  const typeConfig = {
    success: {
      bg: 'bg-emerald-900/95 text-white border-emerald-700/60 shadow-emerald-950/20',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
    },
    error: {
      bg: 'bg-rose-900/95 text-white border-rose-700/60 shadow-rose-950/20',
      icon: <AlertCircle className="w-5 h-5 text-rose-300 shrink-0" />
    },
    warning: {
      bg: 'bg-amber-900/95 text-white border-amber-700/60 shadow-amber-950/20',
      icon: <AlertTriangle className="w-5 h-5 text-amber-300 shrink-0" />
    },
    info: {
      bg: 'bg-slate-900/95 text-white border-slate-700/60 shadow-slate-950/20',
      icon: <Info className="w-5 h-5 text-blue-400 shrink-0" />
    }
  };

  const current = typeConfig[toast.type] || typeConfig.info;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-xl backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-top-3 ${current.bg}`}
    >
      {current.icon}
      <div className="flex-1 text-xs sm:text-sm font-medium leading-snug break-words">
        {toast.message}
      </div>
      <button
        type="button"
        onClick={() => dispatch(removeToast(toast.id))}
        className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors shrink-0"
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const toasts = useSelector((state) => state.ui?.toasts || []);

  if (!toasts || toasts.length === 0) return null;

  return (
    <div
      aria-label="Notifications"
      className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full px-4 sm:px-0 pointer-events-none"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}

export default ToastContainer;
