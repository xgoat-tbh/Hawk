'use client';

import { toast } from 'sonner';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

export type SaveState = 'idle' | 'saving' | 'success' | 'error';

/**
 * Deep equality helper with value normalization.
 * Treats missing values consistently and sorts object keys.
 * Preserves user text exactly so whitespace-only edits remain dirty.
 */
export function normalizeValue(val: any): any {
  if (val === null || val === undefined) return null;
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) return val.map(normalizeValue);
  if (typeof val === 'object') {
    const normalized: Record<string, any> = {};
    for (const key of Object.keys(val).sort()) {
      normalized[key] = normalizeValue(val[key]);
    }
    return normalized;
  }
  return val;
}

export function isConfigEqual<T>(a: T | null | undefined, b: T | null | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return JSON.stringify(normalizeValue(a)) === JSON.stringify(normalizeValue(b));
}

interface UseFormDraftOptions<T> {
  initialData?: T | null;
  onSave?: (draft: T) => Promise<T | void>;
  autoDismissSuccessMs?: number;
  autoSaveMs?: number;
}

export function useFormDraft<T extends Record<string, any>>(options: UseFormDraftOptions<T>) {
  const { initialData, onSave, autoDismissSuccessMs = 2500, autoSaveMs = 0 } = options;

  const [persisted, setPersistedState] = useState<T | null>(initialData || null);
  const [draft, setDraftState] = useState<T | null>(initialData || null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [error, setError] = useState<string | null>(null);

  // Sync initialData when loaded from server (if draft has not been modified)
  const isDirtyRef = useRef(false);
  const initialDataRef = useRef(initialData);

  useEffect(() => {
    if (initialData && !isConfigEqual(initialData, initialDataRef.current)) {
      initialDataRef.current = initialData;
      setPersistedState(initialData);
      // Only overwrite draft if form is currently not dirty
      if (!isDirtyRef.current) {
        setDraftState(initialData);
      }
    }
  }, [initialData]);

  // Derived dirty state
  const isDirty = useMemo(() => {
    if (!persisted || !draft) return false;
    return !isConfigEqual(draft, persisted);
  }, [draft, persisted]);

  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  // Warn before leaving page with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Auto-dismiss success state
  useEffect(() => {
    if (saveState === 'success') {
      const timer = setTimeout(() => {
        setSaveState('idle');
      }, autoDismissSuccessMs);
      return () => clearTimeout(timer);
    }
  }, [saveState, autoDismissSuccessMs]);

  // Field-level updater
  const setField = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setDraftState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [key]: value,
      };
    });
    if (saveState === 'error' || saveState === 'success') {
      setSaveState('idle');
      setError(null);
    }
  }, [saveState]);

  // Partial draft updater
  const updateDraft = useCallback((partial: Partial<T>) => {
    setDraftState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        ...partial,
      };
    });
    if (saveState === 'error' || saveState === 'success') {
      setSaveState('idle');
      setError(null);
    }
  }, [saveState]);

  // Reset draft to persisted baseline
  const reset = useCallback(() => {
    if (persisted) {
      setDraftState(JSON.parse(JSON.stringify(persisted)));
      setSaveState('idle');
      setError(null);
    }
  }, [persisted]);

  // Set new persisted baseline directly (e.g. after server response)
  const setPersisted = useCallback((newPersisted: T) => {
    const cloned = JSON.parse(JSON.stringify(newPersisted));
    setPersistedState(cloned);
    setDraftState(cloned);
    setSaveState('success');
    setError(null);
  }, []);

  const savingRef = useRef(false);

  // Save execution handler
  const save = useCallback(async (): Promise<boolean> => {
    if (!draft || !onSave || savingRef.current) return false;
    savingRef.current = true;

    setSaveState('saving');
    setError(null);

    try {
      const canonicalData = await onSave(draft);
      const cloned = JSON.parse(JSON.stringify(canonicalData || draft));
      setPersistedState(cloned);
      setDraftState(latest => isConfigEqual(latest, draft) ? cloned : latest);
      setSaveState('success');
      toast.success('Changes saved');
      return true;
    } catch (err: any) {
      console.error('Save failed:', err);
      setError(err.message || 'Failed to save configuration changes.');
      setSaveState('error');
      toast.error(err.message || 'Could not save changes');
      return false;
    } finally {
      savingRef.current = false;
    }
  }, [draft, onSave]);

  // Keep the debounce tied to edits, rather than an inline callback identity.
  // Errors require another edit or an explicit retry, never a retry loop.
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    if (!autoSaveMs || !isDirty || saveState === 'saving' || saveState === 'error') return;
    const timer = setTimeout(() => { void saveRef.current(); }, autoSaveMs);
    return () => clearTimeout(timer);
  }, [draft, isDirty, saveState, autoSaveMs]);

  return {
    persisted,
    draft,
    isDirty,
    saveState,
    error,
    setField,
    updateDraft,
    reset,
    save,
    setPersisted,
    setSaveState,
    setError,
  };
}
