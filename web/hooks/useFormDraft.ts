'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

export type SaveState = 'idle' | 'saving' | 'success' | 'error';

/**
 * Deep equality helper with value normalization.
 * Treats null, undefined, and empty strings identically for optional fields,
 * and string numbers identically to numeric representations where appropriate.
 */
export function normalizeValue(val: any): any {
  if (val === null || val === undefined) return null;
  if (typeof val === 'string') return val.trim();
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
}

export function useFormDraft<T extends Record<string, any>>(options: UseFormDraftOptions<T>) {
  const { initialData, onSave, autoDismissSuccessMs = 2500 } = options;

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

  // Save execution handler
  const save = useCallback(async (): Promise<boolean> => {
    if (!draft || !onSave || saveState === 'saving') return false;

    setSaveState('saving');
    setError(null);

    try {
      const canonicalData = await onSave(draft);
      if (canonicalData) {
        const cloned = JSON.parse(JSON.stringify(canonicalData));
        setPersistedState(cloned);
        setDraftState(cloned);
      } else {
        const cloned = JSON.parse(JSON.stringify(draft));
        setPersistedState(cloned);
        setDraftState(cloned);
      }
      setSaveState('success');
      return true;
    } catch (err: any) {
      console.error('Save failed:', err);
      setError(err.message || 'Failed to save configuration changes.');
      setSaveState('error');
      return false;
    }
  }, [draft, onSave, saveState]);

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
