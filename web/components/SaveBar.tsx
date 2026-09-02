'use client';

import React from 'react';
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
  if (!hasChanges && !isSaving && !error && !success) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-surface border border-border/80 shadow-2xl shadow-black/80 rounded-2xl p-4 flex items-center justify-between gap-4 backdrop-blur-xl">
        <div className="flex items-center gap-2.5 text-sm">
          {error ? (
            <>
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span className="text-red-400 font-medium">{error}</span>
            </>
          ) : success ? (
            <>
              <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
              <span className="text-green-400 font-medium">Changes saved successfully!</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-white font-medium">Careful — you have unsaved changes!</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!success && (
            <button
              onClick={onReset}
              disabled={isSaving}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-muted hover:text-white hover:bg-surfaceHover transition-colors disabled:opacity-50"
            >
              Reset
            </button>
          )}
          <button
            onClick={onSave}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-accent hover:bg-accent-hover text-white shadow-lg shadow-accent/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Save Changes</span>
          </button>
        </div>
      </div>
    </div>
  );
}
