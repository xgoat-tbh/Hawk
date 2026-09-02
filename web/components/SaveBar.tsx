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
      <div className="bg-[#0e1016]/95 border border-[#1b1f2b] shadow-2xl shadow-black rounded-xl p-4 flex items-center justify-between gap-4 backdrop-blur-2xl">
        <div className="flex items-center gap-3 text-xs">
          {error ? (
            <>
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span className="text-red-400 font-bold uppercase tracking-wider">{error}</span>
            </>
          ) : success ? (
            <>
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span className="text-emerald-400 font-bold uppercase tracking-wider">Changes synchronized!</span>
            </>
          ) : (
            <>
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 animate-pulse shadow-[0_0_10px_rgba(251,191,36,0.8)]" />
              <span className="text-white font-bold uppercase tracking-wider">Unsaved configuration changes</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!success && (
            <button
              onClick={onReset}
              disabled={isSaving}
              className="btn-box-secondary text-[11px] px-3 py-2"
            >
              Reset
            </button>
          )}
          <button
            onClick={onSave}
            disabled={isSaving}
            className="btn-box-primary text-[11px] px-4 py-2 flex items-center gap-1.5"
          >
            {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Save Changes</span>
          </button>
        </div>
      </div>
    </div>
  );
}
