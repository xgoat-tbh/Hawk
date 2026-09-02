'use client';

import React, { useEffect } from 'react';
import { Loader2, Check, AlertCircle } from 'lucide-react';

interface SaveBarProps {
  hasChanges: boolean;
  isSaving: boolean;
  onSave: () => void;
  onReset: () => void;
  error?: string | null;
  success?: boolean;
}

export function SaveBar({ hasChanges, isSaving, onSave, onReset, error, success }: SaveBarProps) {
  // Global Ctrl+S / Cmd+S shortcut to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (hasChanges && !isSaving) {
          onSave();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasChanges, isSaving, onSave]);

  if (!hasChanges && !isSaving && !error && !success) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4 animate-in fade-in slide-in-from-bottom-5 duration-200">
      <div className="bg-[#0b0b0e]/90 border border-white/[0.12] rounded-2xl p-3 flex items-center justify-between gap-4 backdrop-blur-2xl shadow-2xl">
        <div className="flex items-center gap-2.5 text-xs">
          {error ? (
            <>
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span className="text-red-400 font-medium">{error}</span>
            </>
          ) : success ? (
            <>
              <Check className="w-4 h-4 text-white shrink-0" />
              <span className="text-white font-medium">Changes saved successfully</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="text-white/90 font-medium">Unsaved changes</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-white/40 bg-white/[0.04] border border-white/[0.08] rounded">
                Ctrl+S
              </kbd>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!success && (
            <button
              onClick={onReset}
              disabled={isSaving}
              className="btn-outline-secondary text-[11px] px-3 py-1.5"
            >
              Reset
            </button>
          )}
          <button
            onClick={onSave}
            disabled={isSaving}
            className="btn-primary text-[11px] px-4 py-1.5 flex items-center gap-1.5"
          >
            {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
