'use client';

import React, { useEffect, useRef } from 'react';
import { Loader2, Check, AlertCircle, RefreshCw } from 'lucide-react';
import type { SaveState } from '@/hooks/useFormDraft';
import { animateSaveBarEnter } from '@/lib/animations';

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
  const effectiveIsDirty = isDirty !== undefined ? isDirty : Boolean(hasChanges);
  const effectiveSaveState: SaveState =
    saveState || (isSaving ? 'saving' : success ? 'success' : error ? 'error' : 'idle');

  const barRef = useRef<HTMLDivElement>(null);

  // Global Ctrl+S / Cmd+S shortcut
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

  const isVisible =
    effectiveIsDirty ||
    effectiveSaveState === 'saving' ||
    effectiveSaveState === 'success' ||
    effectiveSaveState === 'error';

  useEffect(() => {
    if (isVisible && barRef.current) {
      animateSaveBarEnter(barRef.current);
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div
      ref={barRef}
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4 pointer-events-auto select-none"
    >
      <div
        className={`border rounded-lg px-4 py-2.5 flex items-center justify-between gap-4 backdrop-blur-xl shadow-popover-clean transition-colors duration-150 ${
          effectiveSaveState === 'success'
            ? 'bg-[#0d1611]/95 border-success-border text-success-text'
            : effectiveSaveState === 'error'
            ? 'bg-[#180f11]/95 border-critical-border text-critical-text'
            : 'bg-[#121417]/95 border-[#2a2d33]'
        }`}
      >
        {/* Left Side: Status Info */}
        <div className="flex items-center gap-2.5 text-xs">
          {effectiveSaveState === 'error' ? (
            <>
              <AlertCircle className="w-4 h-4 text-critical shrink-0" />
              <span className="text-critical-text font-medium text-xs truncate max-w-xs">
                {error || 'Failed to save changes.'}
              </span>
            </>
          ) : effectiveSaveState === 'success' ? (
            <>
              <Check className="w-4 h-4 text-success shrink-0" />
              <span className="text-success-text font-medium text-xs">
                Saved to database
              </span>
            </>
          ) : effectiveSaveState === 'saving' ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-[#949aa2] shrink-0" />
              <span className="text-[#ededed] font-medium text-xs">Persisting changes...</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-warning shrink-0" />
              <span className="text-[#ededed] font-medium text-xs">Careful — unsaved changes</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.2 text-[9px] font-mono text-[#949aa2] bg-[#17191c] border border-[#1f2226] rounded">
                Ctrl+S
              </kbd>
            </>
          )}
        </div>

        {/* Right Side: Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {effectiveSaveState === 'error' ? (
            <>
              <button
                type="button"
                onClick={onReset}
                className="btn-outline-secondary text-[11px] px-2.5 py-1"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={onSave}
                className="btn-primary text-[11px] px-3 py-1 flex items-center gap-1.5"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Retry</span>
              </button>
            </>
          ) : effectiveSaveState === 'success' ? (
            <span className="text-[10px] font-mono text-success-text uppercase tracking-wider px-2 py-0.5">
              ✓ PERSISTED
            </span>
          ) : (
            <>
              <button
                type="button"
                onClick={onReset}
                disabled={effectiveSaveState === 'saving'}
                className="btn-outline-secondary text-[11px] px-2.5 py-1 disabled:opacity-35"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={effectiveSaveState === 'saving'}
                className="btn-primary text-[11px] px-3.5 py-1 disabled:opacity-35 flex items-center gap-1.5"
              >
                {effectiveSaveState === 'saving' ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Changes</span>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
