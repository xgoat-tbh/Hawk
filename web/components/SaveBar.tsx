'use client';

import React, { useEffect, useRef } from 'react';
import { Loader2, Check, AlertCircle, RefreshCw } from 'lucide-react';
import type { SaveState } from '@/hooks/useFormDraft';

interface SaveBarProps {
  isDirty?: boolean;
  hasChanges?: boolean;
  saveState?: SaveState;
  isSaving?: boolean;
  onSave: () => void | Promise<any>;
  onReset: () => void;
  error?: string | null;
  success?: boolean;
}

export function SaveBar({
  isDirty,
  hasChanges,
  saveState,
  isSaving,
  onSave,
  onReset,
  error,
  success,
}: SaveBarProps) {
  // Normalize legacy vs new props
  const effectiveIsDirty = isDirty !== undefined ? isDirty : Boolean(hasChanges);
  const effectiveSaveState: SaveState =
    saveState || (isSaving ? 'saving' : success ? 'success' : error ? 'error' : 'idle');

  const barRef = useRef<HTMLDivElement>(null);

  // Global Ctrl+S / Cmd+S shortcut to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (effectiveIsDirty && effectiveSaveState !== 'saving') {
          onSave();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [effectiveIsDirty, effectiveSaveState, onSave]);

  // If clean, idle, and no errors or successes, don't render
  const isVisible =
    effectiveIsDirty ||
    effectiveSaveState === 'saving' ||
    effectiveSaveState === 'success' ||
    effectiveSaveState === 'error';

  if (!isVisible) return null;

  return (
    <div
      ref={barRef}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4 animate-in fade-in slide-in-from-bottom-3 duration-150"
    >
      <div
        className={`border rounded-lg p-3 flex items-center justify-between gap-4 backdrop-blur-2xl shadow-popover-soft transition-all duration-200 ${
          effectiveSaveState === 'success'
            ? 'bg-[#0d1611]/95 border-success-border text-success-text'
            : effectiveSaveState === 'error'
            ? 'bg-[#180f11]/95 border-critical-border text-critical-text'
            : 'bg-[#0d0e10]/95 border-[#2b2f34]'
        }`}
      >
        {/* Left Side: Status Info */}
        <div className="flex items-center gap-2.5 text-xs">
          {effectiveSaveState === 'error' ? (
            <>
              <AlertCircle className="w-4 h-4 text-critical shrink-0" />
              <span className="text-critical-text font-medium">
                {error || 'Failed to save configuration.'}
              </span>
            </>
          ) : effectiveSaveState === 'success' ? (
            <>
              <Check className="w-4 h-4 text-success shrink-0" />
              <span className="text-success-text font-medium">
                Changes saved to database just now
              </span>
            </>
          ) : effectiveSaveState === 'saving' ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-[#a9adb2] shrink-0" />
              <span className="text-[#f1f2f3] font-medium">Saving configuration to database...</span>
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

        {/* Right Side: Action Controls */}
        <div className="flex items-center gap-2">
          {effectiveSaveState === 'error' ? (
            <>
              <button
                type="button"
                onClick={onReset}
                className="btn-outline-secondary text-[11px] px-3 py-1.5"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={onSave}
                className="btn-primary text-[11px] px-4 py-1.5 flex items-center gap-1.5"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Retry Save</span>
              </button>
            </>
          ) : effectiveSaveState === 'success' ? (
            <span className="text-[10px] font-mono text-success-text uppercase tracking-wider px-2 py-1">
              ✓ PERSISTED
            </span>
          ) : (
            <>
              <button
                type="button"
                onClick={onReset}
                disabled={effectiveSaveState === 'saving'}
                className="btn-outline-secondary text-[11px] px-3 py-1.5 disabled:opacity-50"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={effectiveSaveState === 'saving'}
                className="btn-primary text-[11px] px-4 py-1.5 flex items-center gap-1.5 disabled:opacity-50"
              >
                {effectiveSaveState === 'saving' && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                <span>{effectiveSaveState === 'saving' ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
