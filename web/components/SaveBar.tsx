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
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4 animate-in fade-in slide-in-from-bottom-3 duration-150">
      <div className="bg-[#0d0e10]/95 border border-[#2b2f34] rounded-lg p-3 flex items-center justify-between gap-4 backdrop-blur-2xl shadow-popover-soft">
        <div className="flex items-center gap-2.5 text-xs">
          {error ? (
            <>
              <AlertCircle className="w-4 h-4 text-critical shrink-0" />
              <span className="text-critical-text font-medium">{error}</span>
            </>
          ) : success ? (
            <>
              <Check className="w-4 h-4 text-success shrink-0" />
              <span className="text-success-text font-medium">Changes saved successfully</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
              <span className="text-[#f1f2f3] font-medium">Careful — you have unsaved changes</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-[#7e8389] bg-[#17191c] border border-[#24272b] rounded-sm">
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
