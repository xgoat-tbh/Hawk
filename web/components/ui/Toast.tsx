'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, title?: string) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', title?: string) => {
      const id = `${Date.now()}_${Math.random()}`;
      const newToast: Toast = { id, type, title, message };
      setToasts((prev) => [...prev, newToast]);

      setTimeout(() => {
        removeToast(id);
      }, 4000);
    },
    [removeToast],
  );

  const success = useCallback((msg: string, title?: string) => showToast(msg, 'success', title), [showToast]);
  const error = useCallback((msg: string, title?: string) => showToast(msg, 'error', title), [showToast]);
  const warning = useCallback((msg: string, title?: string) => showToast(msg, 'warning', title), [showToast]);
  const info = useCallback((msg: string, title?: string) => showToast(msg, 'info', title), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => {
          let icon = <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />;
          let borderClass = 'border-blue-500/30 bg-[#0c1017]/95';
          if (toast.type === 'success') {
            icon = <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />;
            borderClass = 'border-emerald-500/30 bg-[#0a1510]/95';
          } else if (toast.type === 'error') {
            icon = <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />;
            borderClass = 'border-rose-500/30 bg-[#170a0c]/95';
          } else if (toast.type === 'warning') {
            icon = <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />;
            borderClass = 'border-amber-500/30 bg-[#181206]/95';
          }

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-lg border shadow-xl backdrop-blur-md transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 ${borderClass}`}
            >
              {icon}
              <div className="flex-1 min-w-0 text-xs">
                {toast.title && <div className="font-semibold text-[#f0f2f5] mb-0.5">{toast.title}</div>}
                <div className="text-[#c1c7cd] leading-relaxed break-words">{toast.message}</div>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-[#687076] hover:text-[#ededed] transition-colors p-0.5 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
