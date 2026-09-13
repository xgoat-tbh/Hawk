'use client';

import React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  isLoading = false,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  let btnColor = 'bg-rose-600 hover:bg-rose-500 text-white';
  if (variant === 'warning') {
    btnColor = 'bg-amber-600 hover:bg-amber-500 text-white';
  } else if (variant === 'primary') {
    btnColor = 'bg-indigo-600 hover:bg-indigo-500 text-white';
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-md bg-white dark:bg-[#0e1013] border border-black/[0.08] dark:border-[#20232b] rounded-xl shadow-2xl p-6 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div
            className={`p-3 rounded-lg shrink-0 ${
              variant === 'danger'
                ? 'bg-rose-500/10 text-rose-400'
                : variant === 'warning'
                ? 'bg-amber-500/10 text-amber-400'
                : 'bg-indigo-500/10 text-indigo-400'
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-[#101217] dark:text-[#f0f2f5]">{title}</h3>
            <p className="mt-1.5 text-xs text-slate-500 dark:text-[#8c949e] leading-relaxed">{description}</p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-black/[0.08] dark:border-[#1a1d24]">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-xs font-medium text-[#101217] dark:text-[#c1c7cd] hover:text-black dark:hover:text-white bg-slate-100 dark:bg-[#16181d] hover:bg-slate-200 dark:hover:bg-[#1f2229] border border-black/[0.08] dark:border-[#262a33] rounded-lg transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 ${btnColor}`}
          >
            {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
