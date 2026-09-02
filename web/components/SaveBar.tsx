'use client';

import React from 'react';
import { Loader2, Check, AlertCircle, Sparkles } from 'lucide-react';

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
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4 animate-in fade-in slide-in-from-bottom-5 duration-200">
      <div className="bg-[#08080a]/95 border border-white/[0.14] rounded-xl p-3.5 flex items-center justify-between gap-4 backdrop-blur-2xl">
        <div className="flex items-center gap-3 text-xs">
          {error ? (
            <>
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span className="text-red-400 font-bold uppercase tracking-wider">{error}</span>
            </>
          ) : success ? (
            <>
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-emerald-400 font-bold uppercase tracking-wider">Changes synchronized!</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-white font-bold uppercase tracking-wider">Unsaved configuration changes</span>
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
            className="btn-outline-primary text-[11px] px-4 py-1.5 flex items-center gap-1.5"
          >
            {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Save Changes</span>
          </button>
        </div>
      </div>
    </div>

  );
}
