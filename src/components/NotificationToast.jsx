import React from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export const NotificationToast = () => {
  const { toastMessage, clearToast } = useApp();

  if (!toastMessage) return null;

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
    info: <Info className="w-5 h-5 text-brand-400 shrink-0" />,
  };

  const borders = {
    success: 'border-emerald-500/30 bg-emerald-950/80 text-emerald-100',
    warning: 'border-amber-500/30 bg-amber-950/80 text-amber-100',
    error: 'border-rose-500/30 bg-rose-950/80 text-rose-100',
    info: 'border-brand-500/30 bg-dark-900/90 text-slate-100',
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md animate-bounce-in shadow-2xl">
      <div className={`flex items-start gap-3 p-4 rounded-xl border backdrop-blur-xl ${borders[toastMessage.type] || borders.info}`}>
        {icons[toastMessage.type] || icons.info}
        <div className="flex-1 pr-2">
          <h4 className="font-semibold text-sm">{toastMessage.title}</h4>
          <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{toastMessage.message}</p>
        </div>
        <button
          onClick={clearToast}
          className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          aria-label="Dismiss notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
