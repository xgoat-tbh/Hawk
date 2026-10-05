import React from 'react';
import { test, expect, vi } from 'vitest';
import { render, screen, renderHook, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useFormDraft } from '@/hooks/useFormDraft';
function Form({ failure = false }: { failure?: boolean }) {
 const form = useFormDraft({ initialData: { prefix: '!' }, onSave: async draft => { if (failure) throw new Error('Write failed'); return { prefix: draft.prefix }; } });
 return <><input aria-label="Prefix" value={form.draft?.prefix || ''} onChange={e => form.setField('prefix',e.target.value)}/><output>{form.isDirty ? 'Unsaved' : 'Saved'}</output><button onClick={form.save}>Save</button><button onClick={form.reset}>Discard</button>{form.error && <p role="alert">{form.error}</p>}</>;
}
test('saving establishes the new persisted baseline and discard restores it', async () => {
 const user = userEvent.setup(); render(<Form/>); const input = screen.getByLabelText('Prefix'); await user.clear(input); await user.type(input,'?'); expect(screen.getByText('Unsaved')).toBeTruthy(); await user.click(screen.getByText('Save')); expect(await screen.findByText('Saved')).toBeTruthy(); await user.type(input,'x'); await user.click(screen.getByText('Discard')); expect((input as HTMLInputElement).value).toBe('?');
});
test('save failure preserves the draft and dirty state', async () => { const user = userEvent.setup(); render(<Form failure/>); const input = screen.getByLabelText('Prefix'); await user.type(input,'x'); await user.click(screen.getByText('Save')); expect(await screen.findByRole('alert')).toBeTruthy(); expect(screen.getByText('Unsaved')).toBeTruthy(); expect((input as HTMLInputElement).value).toBe('!x'); });
test('autosave debounces edits and does not retry failed writes indefinitely', async () => {
 vi.useFakeTimers(); const onSave = vi.fn(async () => { throw new Error('Offline'); });
 try {
  const { result } = renderHook(() => useFormDraft({ initialData: { prefix: '!' }, autoSaveMs: 1500, onSave }));
  act(() => result.current.setField('prefix', '?')); await act(() => vi.advanceTimersByTimeAsync(1000));
  act(() => result.current.setField('prefix', '#')); await act(() => vi.advanceTimersByTimeAsync(1499)); expect(onSave).not.toHaveBeenCalled();
  await act(() => vi.advanceTimersByTimeAsync(1)); expect(onSave).toHaveBeenCalledTimes(1); expect(result.current.isDirty).toBe(true);
  await act(() => vi.advanceTimersByTimeAsync(10000)); expect(onSave).toHaveBeenCalledTimes(1);
 } finally { vi.useRealTimers(); }
});
