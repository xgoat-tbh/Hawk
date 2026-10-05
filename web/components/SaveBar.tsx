'use client';

import React, { useEffect, useRef } from 'react';
import { Loader2, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { createPortal } from 'react-dom';
import type { SaveState } from '@/hooks/useFormDraft';
import { AnimatePresence, motion } from 'framer-motion';
import { saveBarVariants } from '@/lib/motion';

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
    (effectiveIsDirty && saveState === 'success' ? 'idle' : saveState) || (isSaving ? 'saving' : success ? 'success' : error ? 'error' : 'idle');

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

  if (typeof document === 'undefined') return null;
  const host = document.getElementById("save-dock");
  if (!host) return null;
  return createPortal(
    <AnimatePresence>{isVisible && <motion.div variants={saveBarVariants} initial="initial" animate="enter" exit="exit"
      ref={barRef}
      className="hawk-save-bar" role="status" aria-live="polite"
    >
      <div
        className={`border rounded-lg px-4 py-2.5 flex items-center justify-between gap-4 backdrop-blur-xl shadow-popover-clean transition-colors duration-150 ${
          effectiveSaveState === 'success'
            ? 'bg-[#0d1611]/95 border-success-border text-success-text'
            : effectiveSaveState === 'error'
            ? 'bg-[#180f11]/95 border-critical-border text-critical-text'
            : 'bg-white/95 dark:bg-surface-3/95 border-black/[0.1] dark:border-[#2a2d33] shadow-lg'
        }`}
      >
        {/* Left Side: Status Info */}
        <div className="flex items-center gap-2.5 text-xs">
          {effectiveSaveState === 'error' ? (
            <>
              <AlertCircle className="w-4 h-4 text-critical-text shrink-0" />
              <span className="text-critical-text font-medium text-xs truncate max-w-xs">
                {error || 'Failed to save changes.'}
              </span>
            </>
          ) : effectiveSaveState === 'success' ? (
            <>
              <Check className="w-4 h-4 text-success-text shrink-0" />
              <span className="text-success-text font-medium text-xs">
                Changes saved
              </span>
            </>
          ) : effectiveSaveState === 'saving' ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-slate-500 dark:text-text-secondary shrink-0" />
              <span className="text-text-primary dark:text-text-primary font-medium text-xs">Saving changes…</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-warning shrink-0" />
              <span className="text-text-primary dark:text-text-primary font-medium text-xs">Unsaved changes</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.2 text-[9px] font-sans text-slate-500 dark:text-text-secondary bg-slate-100 dark:bg-surface-3 border border-black/[0.08] dark:border-border rounded">
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
            <span className="text-[10px] font-sans text-success-text uppercase tracking-wider px-2 py-0.5">
              Saved
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
    </motion.div>}</AnimatePresence>, host
  );
}
